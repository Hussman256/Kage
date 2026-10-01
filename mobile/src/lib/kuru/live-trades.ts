import type { Address, Hash } from "viem";
import { MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { MARKETS, marketByAddress } from "./markets";
import { getMarketParams, orderBookAbi, sizeAmount, wadPrice, type MarketParams } from "./orderbook";

// Live tail of real traders' Kuru trades. On Kuru, resting limit orders come
// almost entirely from a handful of market-making bots (61,894 orders from 4
// wallets in a sampled hour); humans trade by taking liquidity. So Kage's feed
// shows what traders actually do — their fills — and copying one places the
// user's own limit order at the trader's price.
//
// Direct RPC stopgap until the Envio indexer exists.

export type LiveTrade = {
  key: string; // `${txHash}:${trader}` — one market order can fill several maker orders
  txHash: Hash;
  market: Address;
  pair: string;
  base: string;
  trader: Address; // tx origin: the wallet that decided to trade
  isBuy: boolean; // trader's side (Kuru's SDK treats isBuy=true as consuming asks)
  size: number; // base units, summed across the tx's fills
  price: number; // volume-weighted average across the tx's fills
  fills: number;
  block: bigint;
  at: number; // ms epoch, estimated from block number
  minSize: number; // market minimum order size, base units
};

export type TradesSnapshot = {
  trades: LiveTrade[]; // newest first
  headBlock: bigint | null;
  status: "idle" | "connecting" | "live" | "error";
  error: string | null;
};

const POLL_MS = 1200;
const BACKFILL_BLOCKS = BigInt(2250); // ~15 minutes, so the feed isn't empty on open
const MAX_TRADES = 300;
const BLOCK_MS = 400;

const trades = new Map<string, LiveTrade & { notional: number }>();
const bots = new Set<string>(); // anyone seen providing resting liquidity
const listeners = new Set<() => void>();
let snapshot: TradesSnapshot = { trades: [], headBlock: null, status: "idle", error: null };
let lastBlock: bigint | null = null;
let headRef: { block: bigint; time: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let polling = false;

const estimateTime = (block: bigint) => (headRef ? headRef.time - Number(headRef.block - block) * BLOCK_MS : Date.now());

function publish(patch: Partial<TradesSnapshot>) {
  const list = Array.from(trades.values())
    .filter((t) => !bots.has(t.trader.toLowerCase())) // a wallet can turn out to be a bot later
    .sort((a, b) => (a.block === b.block ? 0 : a.block > b.block ? -1 : 1));
  snapshot = { ...snapshot, ...patch, trades: list };
  listeners.forEach((l) => l());
}

function prune() {
  if (trades.size <= MAX_TRADES) return;
  const oldest = Array.from(trades.values()).sort((a, b) => (a.block < b.block ? -1 : 1));
  for (const t of oldest.slice(0, trades.size - MAX_TRADES)) trades.delete(t.key);
}

async function ingest(from: bigint, to: bigint, params: Map<string, MarketParams>) {
  const logs = await publicClient.getContractEvents({
    address: MARKETS.map((m) => m.address),
    abi: orderBookAbi,
    eventName: "Trade",
    fromBlock: from,
    toBlock: to,
  });

  for (const log of logs) bots.add(log.args.makerAddress!.toLowerCase());

  for (const log of logs) {
    const market = marketByAddress(log.address);
    const p = params.get(log.address.toLowerCase());
    if (!market || !p) continue;
    const origin = log.args.txOrigin!;
    // Skip bots, including operators rebalancing through their own maker contracts.
    if (bots.has(origin.toLowerCase()) || bots.has(log.args.takerAddress!.toLowerCase())) continue;

    const size = sizeAmount(log.args.filledSize!, p);
    const price = wadPrice(log.args.price!);
    const key = `${log.transactionHash}:${origin.toLowerCase()}`;
    const existing = trades.get(key);
    if (existing) {
      existing.size += size;
      existing.notional += size * price;
      existing.price = existing.notional / existing.size;
      existing.fills += 1;
    } else {
      trades.set(key, {
        key,
        txHash: log.transactionHash,
        market: market.address,
        pair: market.pair,
        base: market.base,
        trader: origin,
        isBuy: log.args.isBuy!,
        size,
        price,
        notional: size * price,
        fills: 1,
        block: log.blockNumber,
        at: estimateTime(log.blockNumber),
        minSize: sizeAmount(p.minSize, p),
      });
    }
  }
}

async function tick() {
  if (!polling) return;
  try {
    const params = new Map<string, MarketParams>();
    await Promise.all(MARKETS.map(async (m) => params.set(m.address.toLowerCase(), await getMarketParams(m.address))));

    const head = await publicClient.getBlockNumber({ cacheTime: 0 });
    headRef = { block: head, time: Date.now() };
    // After a pause (backgrounded, no subscribers) skip ahead instead of
    // replaying a long gap 100 blocks at a time.
    let from = lastBlock === null || head - lastBlock > BACKFILL_BLOCKS ? head - BACKFILL_BLOCKS : lastBlock + BigInt(1);

    while (from <= head) {
      const to = from + MAX_LOG_RANGE - BigInt(1) < head ? from + MAX_LOG_RANGE - BigInt(1) : head;
      await ingest(from, to, params);
      lastBlock = to;
      from = to + BigInt(1);
    }

    prune();
    publish({ headBlock: head, status: "live", error: null });
  } catch (e) {
    publish({ status: "error", error: e instanceof Error ? e.message : String(e) });
  }
  if (polling) timer = setTimeout(tick, POLL_MS);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!polling) {
    polling = true;
    publish({ status: "connecting" });
    void tick();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      polling = false;
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}

export const getSnapshot = () => snapshot;
