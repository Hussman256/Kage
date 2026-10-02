import { indexer } from "envio";
import {
  applyBucket,
  applyMakerToTrader,
  applyMarketHour,
  applyTakerToTrader,
  applyTakerTrade,
  bucketId,
  DAY,
  HOUR,
  isMarketMaker,
  marketHourId,
  periodStart,
  takerTradeId,
  type Fill,
  type TraderRow,
} from "../aggregate";

indexer.onEvent(
  {
    contract: "KuruOrderBook",
    event: "Trade",
    fields: { transaction: ["hash"], block: ["timestamp"] },
  },
  async ({ event, context }) => {
    const p = event.params;
    if (p.filledSize === 0n) return;

    const fill: Fill = {
      market: event.srcAddress,
      txHash: event.transaction.hash,
      trader: p.txOrigin,
      taker: p.takerAddress,
      maker: p.makerAddress,
      isBuy: p.isBuy,
      price: p.price,
      size: p.filledSize,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    };
    const hour = periodStart(fill.timestamp, HOUR);
    const day = periodStart(fill.timestamp, DAY);

    // The trader, maker and calling contract can overlap (self-fills, a bot
    // contract trading against itself), so each address is loaded once and
    // its updates applied in sequence. All reads go up front, concurrently,
    // so preload can batch them.
    const addresses = [...new Set([fill.trader, fill.maker, fill.taker])];
    const [trade, traderHour, traderDay, marketHour, ...rows] = await Promise.all([
      context.TakerTrade.get(takerTradeId(fill)),
      context.TraderHour.get(bucketId(fill.market, fill.trader, hour)),
      context.TraderDay.get(bucketId(fill.market, fill.trader, day)),
      context.MarketHour.get(marketHourId(fill.market, hour)),
      ...addresses.map((a) => context.Trader.get(a)),
    ]);
    const traders = new Map<string, TraderRow | undefined>(addresses.map((a, i) => [a, rows[i]]));

    const newTrade = trade === undefined;
    const viaMaker = fill.taker !== fill.trader && isMarketMaker(traders.get(fill.taker));

    context.TakerTrade.set(applyTakerTrade(trade, fill));
    traders.set(fill.trader, applyTakerToTrader(traders.get(fill.trader), fill, newTrade, viaMaker));
    traders.set(fill.maker, applyMakerToTrader(traders.get(fill.maker), fill));
    for (const a of new Set([fill.trader, fill.maker])) {
      const row = traders.get(a);
      if (row) context.Trader.set(row);
    }

    context.TraderHour.set(applyBucket(traderHour, fill, hour, newTrade));
    context.TraderDay.set(applyBucket(traderDay, fill, day, newTrade));
    context.MarketHour.set(applyMarketHour(marketHour, fill, hour));
  },
);
