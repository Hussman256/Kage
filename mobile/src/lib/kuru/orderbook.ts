import { formatUnits, maxUint256, parseAbi, type Address } from "viem";
import { publicClient } from "@/lib/monad";

// Signatures verified against live mainnet logs. Note the docs' OrderBook page is
// wrong in three places: no params are indexed, Trade.price is uint256 (1e18-scaled,
// unlike OrderCreated's uint32), and cancels emit OrdersCanceled(uint40[],address).
export const orderBookAbi = parseAbi([
  "event OrderCreated(uint40 orderId, address owner, uint96 size, uint32 price, bool isBuy)",
  "event OrdersCanceled(uint40[] orderId, address owner)",
  "event Trade(uint40 orderId, address makerAddress, bool isBuy, uint256 price, uint96 updatedSize, address takerAddress, address txOrigin, uint96 filledSize)",
  "function getMarketParams() view returns (uint32, uint96, address, uint256, address, uint256, uint32, uint96, uint96, uint256, uint256)",
  "function bestBidAsk() view returns (uint256, uint256)",
  "function addBuyOrder(uint32 _price, uint96 size, bool _postOnly)",
  "function addSellOrder(uint32 _price, uint96 size, bool _postOnly)",
  "function batchCancelOrders(uint40[] _orderIds)",
  // Live state of a resting order; filled/cancelled orders read back as size 0.
  "function s_orders(uint40) view returns (address ownerAddress, uint96 size, uint40 prev, uint40 next, uint40 flippedId, uint32 price, uint32 flippedPrice, bool isBuy)",
]);

export async function getOrderRemaining(market: Address, orderId: bigint, params: MarketParams) {
  const o = await publicClient.readContract({ address: market, abi: orderBookAbi, functionName: "s_orders", args: [Number(orderId)] });
  return { owner: o[0], remaining: sizeAmount(o[1], params) };
}

// Trade.price and bestBidAsk() are always 1e18-scaled, regardless of market.
const WAD_DECIMALS = 18;

export type MarketParams = {
  priceDecimals: number; // log10(pricePrecision) — scale of OrderCreated.price
  sizeDecimals: number; // log10(sizePrecision) — scale of every size field
  baseAsset: Address;
  baseDecimals: number;
  quoteAsset: Address;
  quoteDecimals: number;
  tickSize: bigint;
  minSize: bigint;
  maxSize: bigint;
  takerFeeBps: number;
  makerFeeBps: number;
};

const log10 = (n: bigint) => n.toString().length - 1;

const paramsCache = new Map<string, Promise<MarketParams>>();

export function getMarketParams(market: Address): Promise<MarketParams> {
  const key = market.toLowerCase();
  let cached = paramsCache.get(key);
  if (!cached) {
    cached = publicClient
      .readContract({ address: market, abi: orderBookAbi, functionName: "getMarketParams" })
      .then((p) => ({
        priceDecimals: log10(BigInt(p[0])),
        sizeDecimals: log10(p[1]),
        baseAsset: p[2],
        baseDecimals: Number(p[3]),
        quoteAsset: p[4],
        quoteDecimals: Number(p[5]),
        tickSize: BigInt(p[6]),
        minSize: p[7],
        maxSize: p[8],
        takerFeeBps: Number(p[9]),
        makerFeeBps: Number(p[10]),
      }));
    // Don't cache failures — the next caller should retry.
    cached.catch(() => paramsCache.delete(key));
    paramsCache.set(key, cached);
  }
  return cached;
}

export const orderPrice = (raw: bigint | number, params: MarketParams) =>
  Number(formatUnits(BigInt(raw), params.priceDecimals));

export const wadPrice = (raw: bigint) => Number(formatUnits(raw, WAD_DECIMALS));

export const sizeAmount = (raw: bigint, params: MarketParams) =>
  Number(formatUnits(raw, params.sizeDecimals));

export async function getBestBidAsk(market: Address) {
  const [bid, ask] = await publicClient.readContract({
    address: market,
    abi: orderBookAbi,
    functionName: "bestBidAsk",
  });
  // An empty side comes back as 0 or uint256 max (seen on both sides).
  const valid = (v: bigint) => v > BigInt(0) && v < maxUint256;
  return {
    bid: valid(bid) ? wadPrice(bid) : null,
    ask: valid(ask) ? wadPrice(ask) : null,
  };
}
