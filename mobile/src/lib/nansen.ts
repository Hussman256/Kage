// Nansen smart-money labels, read from Kage's own site (usekage.xyz
// /api/smart-money), which holds the server-only Nansen key and caches
// Nansen's Monad smart-money DEX trades for 12h. Unset or failing: the app
// stays on its honestly labelled "Top PnL (beta)" ranking.

const API_URL = process.env.EXPO_PUBLIC_KAGE_API_URL || null;
const CACHE_MS = 10 * 60_000;
const TIMEOUT_MS = 10_000;

export type NansenStatus =
  | { live: true; wallets: number; updatedAt: string }
  | { live: false; reason: string };

export type SmartMoney = { status: NansenStatus; labels: Map<string, string> };

let cached: { at: number; promise: Promise<SmartMoney> } | null = null;

async function load(): Promise<SmartMoney> {
  if (!API_URL) return { status: { live: false, reason: "not_configured" }, labels: new Map() };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/smart-money`, { signal: controller.signal });
    const body = (await res.json()) as { error?: string; updatedAt?: string; wallets?: { address: string; label: string }[] };
    if (!res.ok || !body.wallets) return { status: { live: false, reason: body.error ?? `http_${res.status}` }, labels: new Map() };
    const labels = new Map(body.wallets.map((w) => [w.address.toLowerCase(), w.label]));
    return { status: { live: true, wallets: labels.size, updatedAt: body.updatedAt ?? "" }, labels };
  } catch (e) {
    return { status: { live: false, reason: e instanceof Error ? e.message : "fetch_failed" }, labels: new Map() };
  } finally {
    clearTimeout(timer);
  }
}

// Never throws: Nansen being down must not take the leaderboard with it.
export function getSmartMoney(): Promise<SmartMoney> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;
  cached = { at: Date.now(), promise: load() };
  return cached.promise;
}
