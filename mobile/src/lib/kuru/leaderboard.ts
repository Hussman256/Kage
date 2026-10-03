import { formatUnits, type Address } from "viem";
import { BLOCK_MS, MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { flagHighFrequency, HIGH_FREQ_FILLS_PER_HOUR, isVanityAddress } from "./bots";
import * as idx from "./indexer";
import { MARKETS, type KuruMarket } from "./markets";
import { getBestBidAsk, getMarketParams, orderBookAbi, sizeAmount, wadPrice, type MarketParams } from "./orderbook";

// "Top PnL (beta)" — the build plan's honest fallback while Nansen isn't wired.
// Ranks Kuru *takers* (the humans; resting liquidity is ~all market-maker bots)
// by estimated PnL over a window, marked to the current mid price.
//
// With the Envio indexer configured, every window comes from it: 1H from
// individual trades, 24H from hourly buckets, 7D from daily buckets. Without
// it, only 1H is affordable, over direct RPC (100 blocks per eth_getLogs call).

export type Window = "1H" | "24H" | "7D";
export const WINDOWS: Window[] = ["1H", "24H", "7D"];

const HOUR = 3600;
const DAY = 86400;
const RPC_WINDOW_BLOCKS = Math.round((HOUR * 1000) / BLOCK_MS);
const CONCURRENCY = 6;
const MIN_FILLS = 3;
const MIN_VOLUME_QUOTE = 50; // USDC — filters out dust wallets
const CACHE_MS = 60_000;
const RECENT = 12;

export type Fill = {
  at: number; // ms epoch
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
  curve: number[]; // cumulative estimated PnL, per trade (1H) or per bucket
  recent: Fill[]; // newest first; filled in by getTrader for bucketed windows
};

export type Leaderboard = {
  market: KuruMarket;
  window: Window;
  since: number; // ms epoch: start of the data actually ranked
  source: "indexer" | "rpc";
  traders: TraderStats[];
  mid: number;
  fillsSeen: number;
  botsExcluded: number; // market makers + vanity-address and machine-speed takers
  fetchedAt: number;
};

// One step of a trader's history: a trade, or a bucket of them.
type Step = { at: number; fills: number; baseIn: number; baseOut: number; quoteIn: number; quoteOut: number; mark: number };

function rank(byTrader: Map<string, { address: Address; steps: Step[] }>, mid: number) {
  const traders: TraderStats[] = [];
  for (const { address, steps } of byTrader.values()) {
    steps.sort((a, b) => a.at - b.at);
    let cash = 0;
    let net = 0;
    let volume = 0;
    let fills = 0;
    const curve: number[] = [];
    for (const s of steps) {
      fills += s.fills;
      volume += s.quoteIn + s.quoteOut;
      cash += s.quoteIn - s.quoteOut; // quoteIn = received from selling
      net += s.baseIn - s.baseOut;
      curve.push(cash + net * s.mark);
    }
    if (fills < MIN_FILLS || volume < MIN_VOLUME_QUOTE) continue;
    const pnl = cash + net * mid;
    curve.push(pnl);
    traders.push({ rank: 0, address, fills, volumeQuote: volume, netBase: net, pnlQuote: pnl, curve, recent: [] });
  }
  traders.sort((a, b) => b.pnlQuote - a.pnlQuote);
  traders.forEach((t, i) => (t.rank = i + 1));
  return traders;
}

// ---------- indexer ----------

const quote = (wad: string, p: MarketParams) => Number(formatUnits(BigInt(wad), 18 + p.sizeDecimals));
const base = (raw: string, p: MarketParams) => Number(formatUnits(BigInt(raw), p.sizeDecimals));

const toFill = (r: idx.TakerTradeRow, p: MarketParams): Fill => {
  const size = base(r.size, p);
  return { at: r.timestamp * 1000, isBuy: r.isBuy, price: size ? quote(r.quoteWad, p) / size : 0, size, txHash: r.txHash };
};

async function botSet() {
  const bots = new Set<string>();
  for (const r of await idx.getBotCandidates()) {
    // Market makers, or wallets whose taker flow mostly runs through one.
    if (r.makerFills >= idx.MARKET_MAKER_MIN_FILLS || r.viaMakerFills * 2 > r.takerFills) bots.add(r.id);
  }
  return bots;
}

async function buildFromIndexer(market: KuruMarket, window: Window, p: MarketParams, mid: number): Promise<Leaderboard> {
  const nowSec = Math.floor(Date.now() / 1000);
  const bots = await botSet();
  const skipped = new Set<string>();
  const byTrader = new Map<string, { address: Address; steps: Step[] }>();
  const add = (trader: string, step: Step) => {
    const acc = byTrader.get(trader) ?? { address: trader as Address, steps: [] };
    acc.steps.push(step);
    byTrader.set(trader, acc);
  };
  const isBot = (trader: string) => {
    if (bots.has(trader) || isVanityAddress(trader)) {
      skipped.add(trader);
      return true;
    }
    return false;
  };

  let since: number;
  let fillsSeen = 0;
  const recent = new Map<string, Fill[]>();
  const fillsPerTrader = new Map<string, { fills: number; hours: number }>();

  if (window === "1H") {
    since = nowSec - HOUR;
    for (const r of await idx.getTakerTrades(market.address, since)) {
      fillsSeen += r.fills;
      // Also skip trades sent through a market maker's contract.
      if (isBot(r.trader) || bots.has(r.taker)) continue;
      const f = toFill(r, p);
      const q = f.price * f.size;
      add(r.trader, { at: f.at, fills: r.fills, baseIn: f.isBuy ? f.size : 0, baseOut: f.isBuy ? 0 : f.size, quoteIn: f.isBuy ? 0 : q, quoteOut: f.isBuy ? q : 0, mark: f.price });
      const list = recent.get(r.trader) ?? [];
      list.push(f);
      recent.set(r.trader, list);
      const hf = fillsPerTrader.get(r.trader) ?? { fills: 0, hours: 1 };
      hf.fills += r.fills;
      fillsPerTrader.set(r.trader, hf);
    }
  } else {
    const len = window === "24H" ? HOUR : DAY;
    const span = window === "24H" ? DAY : 7 * DAY;
    since = Math.floor((nowSec - span) / len) * len;
    const [buckets, hours] = await Promise.all([
      idx.getBuckets(window === "24H" ? "TraderHour" : "TraderDay", market.address, since),
      idx.getMarketHours(market.address, since),
    ]);
    // Mark each bucket at the market's last price at the end of that period.
    const marks = new Map<number, number>();
    hours.sort((a, b) => a.periodStart - b.periodStart);
    for (const h of hours) {
      marks.set(Math.floor(h.periodStart / len) * len, wadPrice(BigInt(h.lastPriceWad)));
    }
    // If the indexer started inside the window (e.g. a short backfill), label
    // the board with where its data actually begins, not the nominal 7D/24H.
    if (hours.length > 0) since = Math.max(since, hours[0].periodStart);
    for (const b of buckets) {
      fillsSeen += b.fills;
      const hf = fillsPerTrader.get(b.trader) ?? { fills: 0, hours: 0 };
      hf.fills = Math.max(hf.fills, b.fills);
      hf.hours = len / HOUR;
      fillsPerTrader.set(b.trader, hf);
      if (isBot(b.trader)) continue;
      add(b.trader, {
        at: b.periodStart * 1000,
        fills: b.fills,
        baseIn: base(b.sizeBought, p),
        baseOut: base(b.sizeSold, p),
        quoteIn: quote(b.quoteSoldWad, p),
        quoteOut: quote(b.quoteBoughtWad, p),
        mark: marks.get(b.periodStart) ?? mid,
      });
    }
  }

  // Machine-speed takers: HIGH_FREQ_FILLS_PER_HOUR or more in the window
  // (1H), or in any single bucket (24H/7D), scaled to the bucket length.
  for (const [trader, { fills, hours }] of fillsPerTrader) {
    if (fills >= HIGH_FREQ_FILLS_PER_HOUR * hours) {
      flagHighFrequency(trader);
      if (byTrader.delete(trader)) skipped.add(trader);
    }
  }

  const traders = rank(byTrader, mid);
  for (const t of traders) t.recent = (recent.get(t.address) ?? []).sort((a, b) => b.at - a.at).slice(0, RECENT);

  return { market, window, since: since * 1000, source: "indexer", traders, mid, fillsSeen, botsExcluded: skipped.size, fetchedAt: Date.now() };
}

// ---------- direct RPC (1H only) ----------

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

async function buildFromRpc(market: KuruMarket, p: MarketParams, mid: number): Promise<Leaderboard> {
  const head = await publicClient.getBlock({ blockTag: "latest" });
  const headMs = Number(head.timestamp) * 1000;
  const at = (block: bigint) => headMs - Number(head.number - block) * BLOCK_MS;
  const logs = await fetchTrades(market.address, head.number - BigInt(RPC_WINDOW_BLOCKS), head.number);

  // Anyone providing resting liquidity in the window is treated as a
  // market-making bot; so are trades whose taker is one of those contracts
  // (their operators rebalancing through them).
  const bots = new Set(logs.map((l) => l.args.makerAddress!.toLowerCase()));
  const skipped = new Set<string>(bots);

  const byTrader = new Map<string, { address: Address; steps: Step[] }>();
  const recent = new Map<string, Fill[]>();
  for (const l of logs) {
    const origin = l.args.txOrigin!;
    const key = origin.toLowerCase();
    if (bots.has(key) || bots.has(l.args.takerAddress!.toLowerCase())) continue;
    if (isVanityAddress(origin)) {
      skipped.add(key);
      continue;
    }
    const f: Fill = { at: at(l.blockNumber), isBuy: l.args.isBuy!, price: wadPrice(l.args.price!), size: sizeAmount(l.args.filledSize!, p), txHash: l.transactionHash };
    const q = f.price * f.size;
    const acc = byTrader.get(key) ?? { address: origin, steps: [] };
    acc.steps.push({ at: f.at, fills: 1, baseIn: f.isBuy ? f.size : 0, baseOut: f.isBuy ? 0 : f.size, quoteIn: f.isBuy ? 0 : q, quoteOut: f.isBuy ? q : 0, mark: f.price });
    byTrader.set(key, acc);
    recent.set(key, [...(recent.get(key) ?? []), f]);
  }

  for (const [key, { address, steps }] of byTrader) {
    if (steps.length >= HIGH_FREQ_FILLS_PER_HOUR) {
      flagHighFrequency(address); // the live feed hides them too
      byTrader.delete(key);
      skipped.add(key);
    }
  }

  const traders = rank(byTrader, mid);
  for (const t of traders) t.recent = (recent.get(t.address.toLowerCase()) ?? []).sort((a, b) => b.at - a.at).slice(0, RECENT);

  return {
    market,
    window: "1H",
    since: at(head.number - BigInt(RPC_WINDOW_BLOCKS)),
    source: "rpc",
    traders,
    mid,
    fillsSeen: logs.length,
    botsExcluded: skipped.size,
    fetchedAt: Date.now(),
  };
}

// ---------- public API ----------

export const windowAvailable = (w: Window) => w === "1H" || idx.indexerEnabled;

async function build(market: KuruMarket, window: Window): Promise<Leaderboard> {
  if (!windowAvailable(window)) throw new Error(`${window} rankings need the Envio indexer`);
  const [p, book] = await Promise.all([getMarketParams(market.address), getBestBidAsk(market.address)]);
  if (book.bid === null || book.ask === null) throw new Error("Order book is one-sided; can't mark positions");
  const mid = (book.bid + book.ask) / 2;
  return idx.indexerEnabled ? buildFromIndexer(market, window, p, mid) : buildFromRpc(market, p, mid);
}

const cache = new Map<Window, { at: number; promise: Promise<Leaderboard> }>();

export function getLeaderboard(window: Window = "1H", force = false): Promise<Leaderboard> {
  const hit = cache.get(window);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = build(MARKETS[0], window);
  cache.set(window, { at: Date.now(), promise });
  promise.catch(() => {
    if (cache.get(window)?.promise === promise) cache.delete(window); // don't cache failures
  });
  return promise;
}

export async function getTrader(address: string, window: Window = "1H"): Promise<{ board: Leaderboard; trader: TraderStats | null }> {
  const board = await getLeaderboard(window);
  const trader = board.traders.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null;
  // Bucketed windows don't carry individual trades; fetch the latest ones.
  if (trader && trader.recent.length === 0 && board.source === "indexer") {
    const p = await getMarketParams(board.market.address);
    trader.recent = (await idx.getRecentTrades(board.market.address, trader.address, RECENT)).map((r) => toFill(r, p));
  }
  return { board, trader };
}
