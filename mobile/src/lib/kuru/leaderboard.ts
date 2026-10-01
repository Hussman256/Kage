import type { Address } from "viem";
import { MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { flagHighFrequency, HIGH_FREQ_FILLS_PER_HOUR, isVanityAddress } from "./bots";
import { MARKETS, type KuruMarket } from "./markets";
import { getBestBidAsk, getMarketParams, orderBookAbi, sizeAmount, wadPrice } from "./orderbook";

// "Top PnL (beta)" — the build plan's honest fallback while Nansen isn't wired.
// Ranks Kuru *takers* (the humans; resting liquidity is ~all market-maker bots)
// by estimated PnL over a recent window, marked to the current mid price.
//
// Direct RPC can only afford a short window (100 blocks per eth_getLogs call);
// longer windows need the Envio indexer.

export const WINDOW_BLOCKS = 9000; // ~1 hour of 400ms Monad blocks
const CONCURRENCY = 6;
const MIN_FILLS = 3;
const MIN_VOLUME_QUOTE = 50; // USDC — filters out dust wallets
const CACHE_MS = 60_000;

export type Fill = {
  block: bigint;
  isBuy: boolean; // taker side (Kuru's SDK treats isBuy=true as consuming asks)
  price: number;
  size: number; // base units
  txHash: string;
};

export type TraderStats = {
  rank: number;
  address: Address;
  fills: number;
  volumeQuote: number;
  netBase: number; // position change over the window
  pnlQuote: number; // cash flow + netBase × mid
  curve: number[]; // cumulative estimated PnL after each fill
  recent: Fill[]; // newest first
};

export type Leaderboard = {
  market: KuruMarket;
  traders: TraderStats[];
  mid: number;
  windowBlocks: number;
  headBlock: bigint;
  tradesSeen: number;
  botsExcluded: number; // market makers + vanity-address and machine-speed takers
  fetchedAt: number;
};

async function fetchTrades(market: Address, from: bigint, to: bigint) {
  const ranges: [bigint, bigint][] = [];
  for (let start = from; start <= to; start += MAX_LOG_RANGE) {
    const end = start + MAX_LOG_RANGE - BigInt(1);
    ranges.push([start, end < to ? end : to]);
  }

  const out: Awaited<ReturnType<typeof getChunk>> = [];
  let next = 0;
  let failed = 0;
  async function getChunk(a: bigint, b: bigint) {
    return publicClient.getContractEvents({ address: market, abi: orderBookAbi, eventName: "Trade", fromBlock: a, toBlock: b });
  }
  async function worker() {
    while (next < ranges.length) {
      const [a, b] = ranges[next++];
      for (let attempt = 0; ; attempt++) {
        try {
          out.push(...(await getChunk(a, b)));
          break;
        } catch {
          if (attempt === 2) {
            failed++;
            break;
          }
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // A few missing chunks would silently skew rankings — fail instead.
  if (failed > ranges.length * 0.05) throw new Error(`Couldn't load ${failed} of ${ranges.length} block ranges from Monad RPC`);
  return out;
}

async function build(market: KuruMarket): Promise<Leaderboard> {
  const [params, head, book] = await Promise.all([
    getMarketParams(market.address),
    publicClient.getBlockNumber({ cacheTime: 0 }),
    getBestBidAsk(market.address),
  ]);
  if (book.bid === null || book.ask === null) throw new Error("Order book is one-sided; can't mark positions");
  const mid = (book.bid + book.ask) / 2;

  const logs = await fetchTrades(market.address, head - BigInt(WINDOW_BLOCKS), head);

  // Anyone providing resting liquidity in the window is treated as a
  // market-making bot; so are trades whose taker is one of those contracts
  // (their operators rebalancing through them).
  const bots = new Set(logs.map((l) => l.args.makerAddress!.toLowerCase()));

  const vanity = new Set<string>();
  const highFreq = new Set<string>();
  // Scale the per-hour threshold to the window actually fetched.
  const highFreqFills = (HIGH_FREQ_FILLS_PER_HOUR * WINDOW_BLOCKS * 400) / 3_600_000;

  type Acc = { address: Address; fills: Fill[] };
  const byTrader = new Map<string, Acc>();
  for (const l of logs) {
    const origin = l.args.txOrigin!;
    if (bots.has(origin.toLowerCase()) || bots.has(l.args.takerAddress!.toLowerCase())) continue;
    if (isVanityAddress(origin)) {
      vanity.add(origin.toLowerCase());
      continue;
    }
    const key = origin.toLowerCase();
    const acc = byTrader.get(key) ?? { address: origin, fills: [] };
    acc.fills.push({
      block: l.blockNumber,
      isBuy: l.args.isBuy!,
      price: wadPrice(l.args.price!),
      size: sizeAmount(l.args.filledSize!, params),
      txHash: l.transactionHash,
    });
    byTrader.set(key, acc);
  }

  const traders: TraderStats[] = [];
  for (const { address, fills } of byTrader.values()) {
    if (fills.length >= highFreqFills) {
      highFreq.add(address.toLowerCase());
      flagHighFrequency(address); // the live feed hides them too
      continue;
    }
    fills.sort((a, b) => (a.block < b.block ? -1 : a.block > b.block ? 1 : 0));
    let cash = 0;
    let net = 0;
    let volume = 0;
    const curve: number[] = [];
    for (const f of fills) {
      const quote = f.price * f.size;
      volume += quote;
      if (f.isBuy) {
        cash -= quote;
        net += f.size;
      } else {
        cash += quote;
        net -= f.size;
      }
      curve.push(cash + net * f.price); // marked at that fill's price
    }
    if (fills.length < MIN_FILLS || volume < MIN_VOLUME_QUOTE) continue;
    const pnl = cash + net * mid;
    curve.push(pnl);
    traders.push({
      rank: 0,
      address,
      fills: fills.length,
      volumeQuote: volume,
      netBase: net,
      pnlQuote: pnl,
      curve,
      recent: [...fills].reverse().slice(0, 12),
    });
  }

  traders.sort((a, b) => b.pnlQuote - a.pnlQuote);
  traders.forEach((t, i) => (t.rank = i + 1));

  return {
    market,
    traders,
    mid,
    windowBlocks: WINDOW_BLOCKS,
    headBlock: head,
    tradesSeen: logs.length,
    botsExcluded: bots.size + vanity.size + highFreq.size,
    fetchedAt: Date.now(),
  };
}

let cache: { at: number; promise: Promise<Leaderboard> } | null = null;

export function getLeaderboard(force = false): Promise<Leaderboard> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.promise;
  const promise = build(MARKETS[0]);
  cache = { at: Date.now(), promise };
  promise.catch(() => {
    if (cache?.promise === promise) cache = null; // don't cache failures
  });
  return promise;
}

export async function getTrader(address: string): Promise<{ board: Leaderboard; trader: TraderStats | null }> {
  const board = await getLeaderboard();
  const trader = board.traders.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null;
  return { board, trader };
}
