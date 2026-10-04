import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

// Nansen-labelled smart-money wallets active on Monad, for the Kage app to
// tag Kuru traders with. The Nansen key is server-only, so the app reads this
// route instead of calling Nansen.
//
// Source: POST /api/v1/smart-money/dex-trades (Smart Trader, Fund, 30D/90D/180D
// Smart Trader… wallets' DEX trades over the last 24 hours). 5 credits a call;
// the free plan refills to 10 credits a day, so results are cached for 12h.

const NANSEN_URL = "https://api.nansen.ai/api/v1/smart-money/dex-trades";
const REFRESH_SECONDS = 12 * 3600;

type DexTrade = { trader_address: string; trader_address_label: string; block_timestamp: string; trade_value_usd?: number | null };
type Wallet = { address: string; label: string; trades: number; lastTradeAt: string };

const fetchSmartMoney = unstable_cache(
  async () => {
    const res = await fetch(NANSEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: process.env.NANSEN_API_KEY! },
      body: JSON.stringify({ chains: ["monad"], pagination: { page: 1, per_page: 1000 } }),
      cache: "no-store", // caching happens in unstable_cache, once per refresh
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      // e.g. insufficient_credits, unauthenticated, rate_limit_exceeded
      // Body is { code, status, request_id, … }; an unrecognised key gets { message } only.
      const code = body?.code ?? (res.status === 401 || res.status === 403 ? "unauthenticated" : `http_${res.status}`);
      throw new Error(String(code));
    }
    const byAddress = new Map<string, Wallet>();
    for (const t of (body?.data ?? []) as DexTrade[]) {
      const address = t.trader_address.toLowerCase();
      const w = byAddress.get(address) ?? { address, label: t.trader_address_label, trades: 0, lastTradeAt: t.block_timestamp };
      w.trades++;
      if (t.block_timestamp > w.lastTradeAt) w.lastTradeAt = t.block_timestamp;
      byAddress.set(address, w);
    }
    return {
      updatedAt: new Date().toISOString(),
      window: "24h",
      truncated: body?.pagination?.is_last_page === false,
      wallets: [...byAddress.values()],
    };
  },
  ["nansen-smart-money-monad"],
  { revalidate: REFRESH_SECONDS },
);

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.NANSEN_API_KEY) {
    return NextResponse.json({ error: "nansen_not_configured" }, { status: 503, headers: cors });
  }
  try {
    return NextResponse.json(await fetchSmartMoney(), { headers: cors });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "nansen_failed" }, { status: 502, headers: cors });
  }
}

// The Expo web build (used for screenshots) runs on another origin.
const cors = { "access-control-allow-origin": "*" };
