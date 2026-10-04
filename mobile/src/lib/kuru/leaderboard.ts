import { formatUnits, type Address } from "viem";
import { BLOCK_MS, MAX_LOG_RANGE, publicClient } from "@/lib/monad";
import { flagHighFrequency, HIGH_FREQ_FILLS_PER_HOUR, isVanityAddress } from "./bots";
import * as idx from "./indexer";
import { MARKETS, marketByAddress, type KuruMarket } from "./markets";
import { getSmartMoney, type NansenStatus } from "@/lib/nansen";
import { getBestBidAsk, getMarketParams, orderBookAbi, sizeAmount, wadPrice, type MarketParams } from "./orderbook";

// "Top PnL (beta)" — the build plan's honest fallback while Nansen isn't wired.
// Ranks Kuru *takers* (the humans; resting liquidity is ~all market-maker bots)
// by estimated PnL over a window, across every Kuru market. All markets quote
// in USDC, so a trader's PnL is the sum of their per-market PnL, each marked
// to that market's current mid price.
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
  market: KuruMarket;
  at: number; // ms epoch
  isBuy: boolean; // taker side (Kuru's SDK treats isBuy=true as consuming asks)
  price: number;
  size: number; // base units
  txHash: string;
};

// One market's share of a trader's window.
export type Position = {
  market: KuruMarket;
  fills: number;
  volumeQuote: number;
  netBase: number; // position change over the window
  pnlQuote: number; // cash flow + netBase × mid
};

export type TraderStats = {
  rank: number;
  address: Address;
  fills: number;
  volumeQuote: number;
  pnlQuote: number; // sum over positions
  positions: Position[]; // markets traded, biggest volume first
  curve: number[]; // cumulative estimated PnL, per trade (1H) or per bucket
  recent: Fill[]; // newest first; filled in by getTrader for bucketed windows
  nansenLabel: string | null; // e.g. "Smart Trader", when Nansen labels this wallet
};

export type Leaderboard = {
  markets: KuruMarket[];
  window: Window;
  since: number; // ms epoch: start of the data actually ranked
  source: "indexer" | "rpc";
  traders: TraderStats[];
  fillsSeen: number;
  botsExcluded: number; // market makers + vanity-address and machine-speed takers
  fetchedAt: number;
  nansen: NansenStatus;
};

type MarketCtx = { market: KuruMarket; p: MarketParams; mid: number | null };

// One step of a trader's history in one market (m = index into the ctx list):
// a trade, or a bucket of them.
type Step = { m: number; at: number; fills: number; baseIn: number; baseOut: number; quoteIn: number; quoteOut: number; mark: number };
type Steps = Map<string, { address: Address; steps: Step[] }>;

function rank(byTrader: Steps, ctxs: MarketCtx[]) {
  const n = ctxs.length;
  const traders: TraderStats[] = [];
  for (const { address, steps } of byTrader.values()) {
    steps.sort((a, b) => a.at - b.at);
    const cash = new Array<number>(n).fill(0);
    const net = new Array<number>(n).fill(0);
    const vol = new Array<number>(n).fill(0);
    const fills = new Array<number>(n).fill(0);
    const mark = new Array<number>(n).fill(0);
    const curve: number[] = [];
    const value = (price: (m: number) => number) => cash.reduce((sum, c, m) => sum + c + net[m] * price(m), 0);
    for (const s of steps) {
      fills[s.m] += s.fills;
      vol[s.m] += s.quoteIn + s.quoteOut;
      cash[s.m] += s.quoteIn - s.quoteOut; // quoteIn = received from selling
      net[s.m] += s.baseIn - s.baseOut;
      mark[s.m] = s.mark;
      curve.push(value((m) => mark[m]));
    }
    const totalFills = fills.reduce((a, b) => a + b, 0);
    const volume = vol.reduce((a, b) => a + b, 0);
    if (totalFills < MIN_FILLS || volume < MIN_VOLUME_QUOTE) continue;
    // A one-sided book has no mid; mark that market at the trader's last price.
    const mid = (m: number) => ctxs[m].mid ?? mark[m];
    const pnl = value(mid);
    curve.push(pnl);
    const positions: Position[] = [];
    for (let m = 0; m < n; m++) {
      if (fills[m] > 0) positions.push({ market: ctxs[m].market, fills: fills[m], volumeQuote: vol[m], netBase: net[m], pnlQuote: cash[m] + net[m] * mid(m) });
    }
    positions.sort((a, b) => b.volumeQuote - a.volumeQuote);
    traders.push({ rank: 0, address, fills: totalFills, volumeQuote: volume, pnlQuote: pnl, positions, curve, recent: [], nansenLabel: null });
  }
  traders.sort((a, b) => b.pnlQuote - a.pnlQuote);
  traders.forEach((t, i) => (t.rank = i + 1));
  return traders;
}

function adder(byTrader: Steps) {
  return (trader: string, step: Step) => {
    const acc = byTrader.get(trader) ?? { address: trader as Address, steps: [] };
    acc.steps.push(step);
    byTrader.set(trader, acc);
  };
}

const tradeStep = (m: number, f: Fill, fills: number): Step => {
  const q = f.price * f.size;
  return { m, at: f.at, fills, baseIn: f.isBuy ? f.size : 0, baseOut: f.isBuy ? 0 : f.size, quoteIn: f.isBuy ? 0 : q, quoteOut: f.isBuy ? q : 0, mark: f.price };
};

// ---------- indexer ----------

const quote = (wad: string, p: MarketParams) => Number(formatUnits(BigInt(wad), 18 + p.sizeDecimals));
const base = (raw: string, p: MarketParams) => Number(formatUnits(BigInt(raw), p.sizeDecimals));

const toFill = (r: idx.TakerTradeRow, market: KuruMarket, p: MarketParams): Fill => {
  const size = base(r.size, p);
  return { market, at: r.timestamp * 1000, isBuy: r.isBuy, price: size ? quote(r.quoteWad, p) / size : 0, size, txHash: r.txHash };
};

async function botSet() {
  const bots = new Set<string>();
  for (const r of await idx.getBotCandidates()) {
    // Market makers, or wallets whose taker flow mostly runs through one.
    if (r.makerFills >= idx.MARKET_MAKER_MIN_FILLS || r.viaMakerFills * 2 > r.takerFills) bots.add(r.id);
  }
  return bots;
}

type Board = Omit<Leaderboard, "nansen">;

async function buildFromIndexer(ctxs: MarketCtx[], window: Window): Promise<Board> {
  const nowSec = Math.floor(Date.now() / 1000);
  const bots = await botSet();
  const skipped = new Set<string>();
  const byTrader: Steps = new Map();
  const add = adder(byTrader);
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
    const perMarket = await Promise.all(ctxs.map((c) => idx.getTakerTrades(c.market.address, since)));
    perMarket.forEach((rows, m) => {
      for (const r of rows) {
        fillsSeen += r.fills;
        // Machine-speed is judged on a trader's fills across all markets.
        const hf = fillsPerTrader.get(r.trader) ?? { fills: 0, hours: 1 };
        hf.fills += r.fills;
        fillsPerTrader.set(r.trader, hf);
        // Also skip trades sent through a market maker's contract.
        if (isBot(r.trader) || bots.has(r.taker)) continue;
        const f = toFill(r, ctxs[m].market, ctxs[m].p);
        add(r.trader, tradeStep(m, f, r.fills));
        recent.set(r.trader, [...(recent.get(r.trader) ?? []), f]);
      }
    });
  } else {
    const len = window === "24H" ? HOUR : DAY;
    const span = window === "24H" ? DAY : 7 * DAY;
    since = Math.floor((nowSec - span) / len) * len;
    const from = since;
    const perMarket = await Promise.all(
      ctxs.map((c) =>
        Promise.all([
          idx.getBuckets(window === "24H" ? "TraderHour" : "TraderDay", c.market.address, from),
          idx.getMarketHours(c.market.address, from),
          // Day buckets hide a machine-speed hour inside a quiet day, so 7D checks
          // hourly buckets directly (24H already ranks hour buckets).
          window === "7D" ? idx.getBusyHourTraders(c.market.address, from, HIGH_FREQ_FILLS_PER_HOUR) : new Set<string>(),
        ]),
      ),
    );
    let firstHour = Infinity;
    perMarket.forEach(([buckets, hours, busy], m) => {
      for (const trader of busy) fillsPerTrader.set(trader, { fills: Infinity, hours: 1 });
      // Mark each bucket at the market's last price at the end of that period.
      const marks = new Map<number, number>();
      hours.sort((a, b) => a.periodStart - b.periodStart);
      for (const h of hours) marks.set(Math.floor(h.periodStart / len) * len, wadPrice(BigInt(h.lastPriceWad)));
      if (hours.length > 0) firstHour = Math.min(firstHour, hours[0].periodStart);
      const lastPrice = hours.length > 0 ? wadPrice(BigInt(hours[hours.length - 1].lastPriceWad)) : 0;
      const { p } = ctxs[m];
      for (const b of buckets) {
        fillsSeen += b.fills;
        const hf = fillsPerTrader.get(b.trader) ?? { fills: 0, hours: 0 };
        hf.fills = Math.max(hf.fills, b.fills);
        hf.hours = len / HOUR;
        fillsPerTrader.set(b.trader, hf);
        if (isBot(b.trader)) continue;
        add(b.trader, {
          m,
          at: b.periodStart * 1000,
          fills: b.fills,
          baseIn: base(b.sizeBought, p),
          baseOut: base(b.sizeSold, p),
          quoteIn: quote(b.quoteSoldWad, p),
          quoteOut: quote(b.quoteBoughtWad, p),
          mark: marks.get(b.periodStart) ?? ctxs[m].mid ?? lastPrice,
        });
      }
    });
    // If the indexer started inside the window (e.g. a short backfill), label
    // the board with where its data actually begins, not the nominal 7D/24H.
    if (firstHour !== Infinity) since = Math.max(since, firstHour);
  }

  // Machine-speed takers: HIGH_FREQ_FILLS_PER_HOUR or more in the window
  // (1H), or in any single bucket (24H/7D), scaled to the bucket length.
  for (const [trader, { fills, hours }] of fillsPerTrader) {
    if (fills >= HIGH_FREQ_FILLS_PER_HOUR * hours) {
      flagHighFrequency(trader);
      if (byTrader.delete(trader)) skipped.add(trader);
    }
  }

  const traders = rank(byTrader, ctxs);
  for (const t of traders) t.recent = (recent.get(t.address) ?? []).sort((a, b) => b.at - a.at).slice(0, RECENT);

  return { markets: ctxs.map((c) => c.market), window, since: since * 1000, source: "indexer", traders, fillsSeen, botsExcluded: skipped.size, fetchedAt: Date.now() };
}

// ---------- direct RPC (1H only) ----------

async function fetchTrades(markets: Address[], from: bigint, to: bigint) {
  const ranges: [bigint, bigint][] = [];
  for (let start = from; start <= to; start += MAX_LOG_RANGE) {
    const end = start + MAX_LOG_RANGE - BigInt(1);
    ranges.push([start, end < to ? end : to]);
  }

  const out: Awaited<ReturnType<typeof getChunk>> = [];
  let next = 0;
  let failed = 0;
  async function getChunk(a: bigint, b: bigint) {
    return publicClient.getContractEvents({ address: markets, abi: orderBookAbi, eventName: "Trade", fromBlock: a, toBlock: b });
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

async function buildFromRpc(ctxs: MarketCtx[]): Promise<Board> {
  const head = await publicClient.getBlock({ blockTag: "latest" });
  const headMs = Number(head.timestamp) * 1000;
  const at = (block: bigint) => headMs - Number(head.number - block) * BLOCK_MS;
  const logs = await fetchTrades(
    ctxs.map((c) => c.market.address),
    head.number - BigInt(RPC_WINDOW_BLOCKS),
    head.number,
  );
  const marketIndex = new Map(ctxs.map((c, m) => [c.market.address.toLowerCase(), m]));

  // Anyone providing resting liquidity in the window is treated as a
  // market-making bot; so are trades whose taker is one of those contracts
  // (their operators rebalancing through them).
  const bots = new Set(logs.map((l) => l.args.makerAddress!.toLowerCase()));
  const skipped = new Set<string>(bots);

  const byTrader: Steps = new Map();
  const recent = new Map<string, Fill[]>();
  for (const l of logs) {
    const m = marketIndex.get(l.address.toLowerCase());
    if (m === undefined) continue;
    const origin = l.args.txOrigin!;
    const key = origin.toLowerCase();
    if (bots.has(key) || bots.has(l.args.takerAddress!.toLowerCase())) continue;
    if (isVanityAddress(origin)) {
      skipped.add(key);
      continue;
    }
    const f: Fill = { market: ctxs[m].market, at: at(l.blockNumber), isBuy: l.args.isBuy!, price: wadPrice(l.args.price!), size: sizeAmount(l.args.filledSize!, ctxs[m].p), txHash: l.transactionHash };
    const acc = byTrader.get(key) ?? { address: origin, steps: [] };
    acc.steps.push(tradeStep(m, f, 1));
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

  const traders = rank(byTrader, ctxs);
  for (const t of traders) t.recent = (recent.get(t.address.toLowerCase()) ?? []).sort((a, b) => b.at - a.at).slice(0, RECENT);

  return {
    markets: ctxs.map((c) => c.market),
    window: "1H",
    since: at(head.number - BigInt(RPC_WINDOW_BLOCKS)),
    source: "rpc",
    traders,
    fillsSeen: logs.length,
    botsExcluded: skipped.size,
    fetchedAt: Date.now(),
  };
}

// ---------- public API ----------

export const windowAvailable = (w: Window) => w === "1H" || idx.indexerEnabled;

async function marketCtx(market: KuruMarket): Promise<MarketCtx> {
  const [p, book] = await Promise.all([getMarketParams(market.address), getBestBidAsk(market.address)]);
  return { market, p, mid: book.bid !== null && book.ask !== null ? (book.bid + book.ask) / 2 : null };
}

async function build(window: Window): Promise<Leaderboard> {
  if (!windowAvailable(window)) throw new Error(`${window} rankings need the Envio indexer`);
  const smartMoney = getSmartMoney(); // never throws
  const ctxs = await Promise.all(MARKETS.map(marketCtx));
  const board = await (idx.indexerEnabled ? buildFromIndexer(ctxs, window) : buildFromRpc(ctxs));
  const { status, labels } = await smartMoney;
  for (const t of board.traders) t.nansenLabel = labels.get(t.address.toLowerCase()) ?? null;
  return { ...board, nansen: status };
}

const cache = new Map<Window, { at: number; promise: Promise<Leaderboard> }>();

export function getLeaderboard(window: Window = "1H", force = false): Promise<Leaderboard> {
  const hit = cache.get(window);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = build(window);
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
    const rows = await idx.getRecentTrades(trader.address, RECENT);
    const fills: Fill[] = [];
    for (const r of rows) {
      const market = marketByAddress(r.market);
      if (market) fills.push(toFill(r, market, await getMarketParams(market.address)));
    }
    trader.recent = fills;
  }
  return { board, trader };
}
