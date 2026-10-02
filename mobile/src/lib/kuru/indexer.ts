// Read side of Kage's Envio indexer (repo: indexer/). It serves Hasura
// GraphQL over Kuru taker trades and per-trader hourly/daily buckets, so the
// app can rank 24H and 7D windows that direct RPC can't afford.
//
// BigInt columns arrive as strings. Units are documented in
// indexer/schema.graphql: sizes in sizePrecision, *QuoteWad = Σ price(1e18) × size.

export const INDEXER_URL = process.env.EXPO_PUBLIC_INDEXER_URL || null;
export const indexerEnabled = INDEXER_URL !== null;

// Must match MARKET_MAKER_MIN_FILLS in indexer/src/aggregate.ts.
export const MARKET_MAKER_MIN_FILLS = 50;

const PAGE = 1000;
const MAX_PAGES = 40;
const TIMEOUT_MS = 15_000;

export type TakerTradeRow = {
  trader: string;
  taker: string;
  isBuy: boolean;
  size: string;
  quoteWad: string;
  fills: number;
  timestamp: number;
  txHash: string;
};

export type BucketRow = {
  trader: string;
  periodStart: number;
  fills: number;
  sizeBought: string;
  sizeSold: string;
  quoteBoughtWad: string;
  quoteSoldWad: string;
};

export type MarketHourRow = { periodStart: number; lastPriceWad: string };

export type TraderRow = { id: string; takerFills: number; makerFills: number; viaMakerFills: number };

// Values are inlined into queries, so only accept what we generate ourselves.
const address = (a: string) => {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error(`Bad address: ${a}`);
  return a.toLowerCase();
};
const int = (n: number) => {
  if (!Number.isSafeInteger(n)) throw new Error(`Bad integer: ${n}`);
  return n;
};

async function gql<T>(query: string): Promise<T> {
  if (!INDEXER_URL) throw new Error("Indexer not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Indexer HTTP ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(`Indexer: ${body.errors[0].message}`);
    if (!body.data) throw new Error("Indexer returned no data");
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

// Pages through one entity in a stable order. Throws rather than returning a
// truncated set, since partial data would silently skew rankings.
async function fetchAll<T>(entity: string, where: string, fields: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await gql<Record<string, T[]>>(
      `{ ${entity}(where: ${where}, order_by: {id: asc}, limit: ${PAGE}, offset: ${page * PAGE}) { ${fields} } }`,
    );
    const rows = data[entity] ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
  throw new Error(`Too many ${entity} rows for one window`);
}

const BUCKET_FIELDS = "trader periodStart fills sizeBought sizeSold quoteBoughtWad quoteSoldWad";
const TRADE_FIELDS = "trader taker isBuy size quoteWad fills timestamp txHash";

export const getTakerTrades = (market: string, sinceSec: number) =>
  fetchAll<TakerTradeRow>(
    "TakerTrade",
    `{market: {_eq: "${address(market)}"}, timestamp: {_gte: ${int(sinceSec)}}}`,
    TRADE_FIELDS,
  );

export const getBuckets = (kind: "TraderHour" | "TraderDay", market: string, sinceSec: number) =>
  fetchAll<BucketRow>(kind, `{market: {_eq: "${address(market)}"}, periodStart: {_gte: ${int(sinceSec)}}}`, BUCKET_FIELDS);

export const getMarketHours = (market: string, sinceSec: number) =>
  fetchAll<MarketHourRow>(
    "MarketHour",
    `{market: {_eq: "${address(market)}"}, periodStart: {_gte: ${int(sinceSec)}}}`,
    "periodStart lastPriceWad",
  );

// Wallets that look like bots from all indexed history: market makers, and
// wallets that mostly trade through a market maker's contract.
export const getBotCandidates = () =>
  fetchAll<TraderRow>(
    "Trader",
    `{_or: [{makerFills: {_gte: ${MARKET_MAKER_MIN_FILLS}}}, {viaMakerFills: {_gt: 0}}]}`,
    "id takerFills makerFills viaMakerFills",
  );

export async function getRecentTrades(market: string, trader: string, limit: number) {
  const data = await gql<{ TakerTrade: TakerTradeRow[] }>(
    `{ TakerTrade(where: {market: {_eq: "${address(market)}"}, trader: {_eq: "${address(trader)}"}}, order_by: {timestamp: desc}, limit: ${int(limit)}) { ${TRADE_FIELDS} } }`,
  );
  return data.TakerTrade;
}
