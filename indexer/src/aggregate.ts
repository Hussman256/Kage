// Pure aggregation for one Kuru Trade log, kept free of envio imports so it can
// be replayed against real logs outside the indexer. Row shapes mirror
// schema.graphql; see the units note there.

export const HOUR = 3600;
export const DAY = 86400;

// Market makers fill thousands of orders a day; a Kage user's copies (resting
// limit orders) only a handful. The app uses the same threshold.
export const MARKET_MAKER_MIN_FILLS = 50;

export const periodStart = (timestamp: number, length: number) => timestamp - (timestamp % length);

export type Fill = {
  market: string;
  txHash: string;
  trader: string; // tx origin
  taker: string;
  maker: string;
  isBuy: boolean; // taker's side
  price: bigint; // 1e18-scaled
  size: bigint; // sizePrecision
  blockNumber: number;
  timestamp: number;
};

export type TakerTradeRow = {
  id: string;
  market: string;
  trader: string;
  taker: string;
  isBuy: boolean;
  size: bigint;
  quoteWad: bigint;
  fills: number;
  blockNumber: number;
  timestamp: number;
  txHash: string;
};

export type TraderRow = {
  id: string;
  takerFills: number;
  takerTrades: number;
  takerQuoteWad: bigint;
  makerFills: number;
  viaMakerFills: number;
  firstTimestamp: number;
  lastTakerTimestamp: number;
};

export type BucketRow = {
  id: string;
  market: string;
  trader: string;
  periodStart: number;
  fills: number;
  trades: number;
  sizeBought: bigint;
  sizeSold: bigint;
  quoteBoughtWad: bigint;
  quoteSoldWad: bigint;
};

export type MarketHourRow = {
  id: string;
  market: string;
  periodStart: number;
  fills: number;
  size: bigint;
  quoteWad: bigint;
  lastPriceWad: bigint;
};

export const takerTradeId = (f: Fill) => `${f.market}_${f.txHash}_${f.trader}_${f.isBuy ? "b" : "s"}`;
export const bucketId = (market: string, trader: string, start: number) => `${market}_${trader}_${start}`;
export const marketHourId = (market: string, start: number) => `${market}_${start}`;

export function applyTakerTrade(prev: TakerTradeRow | undefined, f: Fill): TakerTradeRow {
  const quote = f.price * f.size;
  if (!prev) {
    return {
      id: takerTradeId(f),
      market: f.market,
      trader: f.trader,
      taker: f.taker,
      isBuy: f.isBuy,
      size: f.size,
      quoteWad: quote,
      fills: 1,
      blockNumber: f.blockNumber,
      timestamp: f.timestamp,
      txHash: f.txHash,
    };
  }
  return { ...prev, size: prev.size + f.size, quoteWad: prev.quoteWad + quote, fills: prev.fills + 1 };
}

const newTrader = (id: string, timestamp: number): TraderRow => ({
  id,
  takerFills: 0,
  takerTrades: 0,
  takerQuoteWad: 0n,
  makerFills: 0,
  viaMakerFills: 0,
  firstTimestamp: timestamp,
  lastTakerTimestamp: 0,
});

export const isMarketMaker = (row: TraderRow | undefined) => (row?.makerFills ?? 0) >= MARKET_MAKER_MIN_FILLS;

// newTrade: this fill opened a TakerTrade (first fill of the tx on this side).
// viaMaker: the calling contract is a known market maker, i.e. its operator
// rebalancing through it rather than a person trading.
export function applyTakerToTrader(prev: TraderRow | undefined, f: Fill, newTrade: boolean, viaMaker: boolean): TraderRow {
  const t = prev ?? newTrader(f.trader, f.timestamp);
  return {
    ...t,
    takerFills: t.takerFills + 1,
    viaMakerFills: t.viaMakerFills + (viaMaker ? 1 : 0),
    takerTrades: t.takerTrades + (newTrade ? 1 : 0),
    takerQuoteWad: t.takerQuoteWad + f.price * f.size,
    lastTakerTimestamp: f.timestamp,
  };
}

export function applyMakerToTrader(prev: TraderRow | undefined, f: Fill): TraderRow {
  const t = prev ?? newTrader(f.maker, f.timestamp);
  return { ...t, makerFills: t.makerFills + 1 };
}

export function applyBucket(prev: BucketRow | undefined, f: Fill, start: number, newTrade: boolean): BucketRow {
  const b: BucketRow = prev ?? {
    id: bucketId(f.market, f.trader, start),
    market: f.market,
    trader: f.trader,
    periodStart: start,
    fills: 0,
    trades: 0,
    sizeBought: 0n,
    sizeSold: 0n,
    quoteBoughtWad: 0n,
    quoteSoldWad: 0n,
  };
  const quote = f.price * f.size;
  return {
    ...b,
    fills: b.fills + 1,
    trades: b.trades + (newTrade ? 1 : 0),
    sizeBought: b.sizeBought + (f.isBuy ? f.size : 0n),
    sizeSold: b.sizeSold + (f.isBuy ? 0n : f.size),
    quoteBoughtWad: b.quoteBoughtWad + (f.isBuy ? quote : 0n),
    quoteSoldWad: b.quoteSoldWad + (f.isBuy ? 0n : quote),
  };
}

export function applyMarketHour(prev: MarketHourRow | undefined, f: Fill, start: number): MarketHourRow {
  const m: MarketHourRow = prev ?? {
    id: marketHourId(f.market, start),
    market: f.market,
    periodStart: start,
    fills: 0,
    size: 0n,
    quoteWad: 0n,
    lastPriceWad: f.price,
  };
  return { ...m, fills: m.fills + 1, size: m.size + f.size, quoteWad: m.quoteWad + f.price * f.size, lastPriceWad: f.price };
}
