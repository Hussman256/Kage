import { formatUnits, type Address, type Hash } from "viem";
import { BLOCK_MS, MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { isLikelyBot, isVanityAddress } from "./bots";
import * as idx from "./indexer";
import { MARKETS, marketByAddress } from "./markets";
import { getMarketParams, orderBookAbi, sizeAmount, wadPrice, type MarketParams } from "./orderbook";

// Live tail of real traders' Kuru trades. On Kuru, resting limit orders come
// almost entirely from a handful of market-making bots (61,894 orders from 4
// wallets in a sampled hour); humans trade by taking liquidity. So Kage's feed
// shows what traders actually do — their fills — and copying one places the
// user's own limit order at the trader's price.
//
// With the Envio indexer configured, the feed opens with indexed history (the
// last two hours, plus followed wallets' latest trades however old) and RPC
// tails new blocks. Without it, RPC backfills ~15 minutes.

export type LiveTrade = {
  key: string; // `${txHash}:${trader}:${market}` — one market order can fill several maker orders
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
const BACKFILL_BLOCKS = BigInt(3000); // ~15 minutes, so the feed isn't empty on open
const INDEXED_RPC_BACKFILL = BigInt(600); // ~3 minutes: covers indexer lag
const INDEXER_HISTORY_SEC = 2 * 3600;
const MAX_TRADES = 300;
const FOLLOWED_PER_LOAD = 200;

const trades = new Map<string, LiveTrade & { notional: number }>();
const bots = new Set<string>(); // anyone seen providing resting liquidity
const listeners = new Set<() => void>();
let snapshot: TradesSnapshot = { trades: [], headBlock: null, status: "idle", error: null };
let lastBlock: bigint | null = null;
let headRef: { block: bigint; time: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let polling = false;
// Keys loaded from the indexer, so RPC doesn't add their fills a second time.
const indexed = new Set<string>();
let indexerLoaded = false;
let followed = new Set<string>();
let followedLoaded = "";

const tradeKey = (tx: string, trader: string, market: string) => `${tx}:${trader.toLowerCase()}:${market.toLowerCase()}`;

const estimateTime = (block: bigint) => (headRef ? headRef.time - Number(headRef.block - block) * BLOCK_MS : Date.now());

function publish(patch: Partial<TradesSnapshot>) {
  const list = Array.from(trades.values())
    // A wallet can turn out to be a bot later (seen making, or flagged
    // machine-speed by the leaderboard), so filter at publish time.
    .filter((t) => !bots.has(t.trader.toLowerCase()) && !isLikelyBot(t.trader))
    .sort((a, b) => (a.block === b.block ? 0 : a.block > b.block ? -1 : 1));
  snapshot = { ...snapshot, ...patch, trades: list };
  listeners.forEach((l) => l());
}

// Followed wallets' trades are kept however old; everyone else's are capped.
function prune() {
  const others = Array.from(trades.values()).filter((t) => !followed.has(t.trader.toLowerCase()));
  if (others.length <= MAX_TRADES) return;
  others.sort((a, b) => (a.block < b.block ? -1 : 1));
  for (const t of others.slice(0, others.length - MAX_TRADES)) {
    trades.delete(t.key);
    indexed.delete(t.key);
  }
}

function addIndexed(rows: idx.FeedTradeRow[], params: Map<string, MarketParams>) {
  for (const r of rows) {
    const market = marketByAddress(r.market);
    const p = params.get(r.market.toLowerCase());
    if (!market || !p || isVanityAddress(r.trader)) continue;
    const key = tradeKey(r.txHash, r.trader, r.market);
    if (trades.has(key)) continue;
    const size = Number(formatUnits(BigInt(r.size), p.sizeDecimals));
    const notional = Number(formatUnits(BigInt(r.quoteWad), 18 + p.sizeDecimals));
    if (!size) continue;
    indexed.add(key);
    trades.set(key, {
      key,
      txHash: r.txHash as Hash,
      market: market.address,
      pair: market.pair,
      base: market.base,
      trader: r.trader as Address,
      isBuy: r.isBuy,
      size,
      price: notional / size,
      notional,
      fills: r.fills,
      block: BigInt(r.blockNumber),
      at: r.timestamp * 1000,
      minSize: sizeAmount(p.minSize, p),
    });
  }
}

// Indexed history on first open. Failures fall back to RPC-only quietly: the
// feed still works, just with less history.
async function loadIndexed(params: Map<string, MarketParams>) {
  if (!idx.indexerEnabled || indexerLoaded) return;
  try {
    const indexedBots = await idx.getIndexedBots();
    indexedBots.forEach((b) => bots.add(b));
    const sinceSec = Math.floor(Date.now() / 1000) - INDEXER_HISTORY_SEC;
    addIndexed(await idx.getFeedTrades({ sinceSec, exclude: indexedBots, limit: MAX_TRADES }), params);
    indexerLoaded = true;
  } catch {
    indexerLoaded = false;
  }
}

async function loadFollowed(params: Map<string, MarketParams>) {
  const list = [...followed].sort();
  const sig = list.join(",");
  if (!idx.indexerEnabled || !indexerLoaded || !list.length || sig === followedLoaded) return;
  try {
    addIndexed(await idx.getFeedTrades({ traders: list, exclude: bots, limit: FOLLOWED_PER_LOAD }), params);
    followedLoaded = sig;
  } catch {
    // Retried next tick.
  }
}

// Called by the Feed with the user's follows, so their history is loaded even
// when they haven't traded in the last few hours.
export function setFollowed(addresses: Iterable<string>) {
  followed = new Set([...addresses].map((a) => a.toLowerCase()));
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
    if (bots.has(origin.toLowerCase()) || bots.has(log.args.takerAddress!.toLowerCase()) || isVanityAddress(origin)) continue;

    const size = sizeAmount(log.args.filledSize!, p);
    const price = wadPrice(log.args.price!);
    const key = tradeKey(log.transactionHash, origin, log.address);
    if (indexed.has(key)) continue;
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

    await loadIndexed(params);
    await loadFollowed(params);

    const head = await publicClient.getBlockNumber({ cacheTime: 0 });
    headRef = { block: head, time: Date.now() };
    // After a pause (backgrounded, no subscribers) skip ahead instead of
    // replaying a long gap 100 blocks at a time.
    const backfill = indexerLoaded ? INDEXED_RPC_BACKFILL : BACKFILL_BLOCKS;
    let from = lastBlock === null || head - lastBlock > backfill ? head - backfill : lastBlock + BigInt(1);

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
