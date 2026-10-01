import type { Address, Hash } from "viem";
import { MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { MARKETS, marketByAddress } from "./markets";
import { getMarketParams, orderBookAbi, orderPrice, sizeAmount, type MarketParams } from "./orderbook";

// Direct RPC tail of Kuru order events. This is the bootstrap read path until
// the Envio indexer exists; it only sees orders placed while the app is open
// (plus a short backfill), so it can't answer historical questions like PnL.

export type OrderStatus = "open" | "partial" | "filled" | "cancelled";

export type LiveOrder = {
  key: string; // `${market}:${orderId}` — order ids are only unique per market
  orderId: bigint;
  market: Address;
  pair: string;
  base: string;
  owner: Address;
  isBuy: boolean;
  price: number;
  size: number;
  remaining: number;
  minSize: number; // market minimum, in base units
  status: OrderStatus;
  block: bigint;
  placedAt: number; // ms epoch, estimated from block number (see estimateTime)
  txHash: Hash;
};

export type FeedSnapshot = {
  orders: LiveOrder[]; // newest first
  headBlock: bigint | null;
  status: "idle" | "connecting" | "live" | "error";
  error: string | null;
};

const POLL_MS = 1200;
const BACKFILL_BLOCKS = BigInt(300); // ~2 minutes of Monad blocks
const MAX_ORDERS = 400;

const orders = new Map<string, LiveOrder>();
const listeners = new Set<() => void>();
let snapshot: FeedSnapshot = { orders: [], headBlock: null, status: "idle", error: null };
let lastBlock: bigint | null = null;
let headRef: { block: bigint; time: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let polling = false;

// Monad targets 400ms blocks; interpolating from the head avoids an extra
// eth_getBlockByNumber call per log.
const BLOCK_MS = 400;
function estimateTime(block: bigint) {
  if (!headRef) return Date.now();
  return headRef.time - Number(headRef.block - block) * BLOCK_MS;
}

function publish(patch: Partial<FeedSnapshot>) {
  const sorted = Array.from(orders.values()).sort((a, b) => (a.block === b.block ? 0 : a.block > b.block ? -1 : 1));
  snapshot = { ...snapshot, ...patch, orders: sorted };
  listeners.forEach((l) => l());
}

function prune() {
  if (orders.size <= MAX_ORDERS) return;
  // Drop closed orders first, then the oldest open ones.
  const all = Array.from(orders.values()).sort((a, b) => {
    const closed = (o: LiveOrder) => (o.status === "filled" || o.status === "cancelled" ? 0 : 1);
    return closed(a) - closed(b) || (a.block < b.block ? -1 : 1);
  });
  for (const o of all.slice(0, orders.size - MAX_ORDERS)) orders.delete(o.key);
}

async function ingest(from: bigint, to: bigint, params: Map<string, MarketParams>) {
  const logs = await publicClient.getContractEvents({
    address: MARKETS.map((m) => m.address),
    abi: orderBookAbi,
    fromBlock: from,
    toBlock: to,
  });

  for (const log of logs) {
    const market = marketByAddress(log.address);
    const p = params.get(log.address.toLowerCase());
    if (!market || !p) continue;

    if (log.eventName === "OrderCreated") {
      const { orderId, owner, size, price, isBuy } = log.args;
      const amount = sizeAmount(size!, p);
      const key = `${market.address}:${orderId}`;
      orders.set(key, {
        key,
        orderId: BigInt(orderId!),
        market: market.address,
        pair: market.pair,
        base: market.base,
        owner: owner!,
        isBuy: isBuy!,
        price: orderPrice(price!, p),
        size: amount,
        remaining: amount,
        minSize: sizeAmount(p.minSize, p),
        status: "open",
        block: log.blockNumber,
        placedAt: estimateTime(log.blockNumber),
        txHash: log.transactionHash,
      });
    } else if (log.eventName === "Trade") {
      const o = orders.get(`${market.address}:${log.args.orderId}`);
      if (o) {
        o.remaining = sizeAmount(log.args.updatedSize!, p);
        o.status = o.remaining === 0 ? "filled" : "partial";
      }
    } else if (log.eventName === "OrdersCanceled") {
      for (const id of log.args.orderId ?? []) {
        const o = orders.get(`${market.address}:${id}`);
        if (o) o.status = "cancelled";
      }
    }
  }
}

async function tick() {
  if (!polling) return;
  try {
    const params = new Map<string, MarketParams>();
    await Promise.all(
      MARKETS.map(async (m) => params.set(m.address.toLowerCase(), await getMarketParams(m.address))),
    );

    const head = await publicClient.getBlockNumber({ cacheTime: 0 });
    headRef = { block: head, time: Date.now() };
    // After a pause (no subscribers, backgrounded tab) skip ahead rather than
    // replaying thousands of blocks 100 at a time.
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
