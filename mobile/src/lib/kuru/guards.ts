import AsyncStorage from "@react-native-async-storage/async-storage";

// Pre-flight checks from the Risk screen, run before any copy can be signed.

export const RATE_LIMIT_PER_MINUTE = 6;
const RATE_KEY = "kage.copyTimestamps.v1";

async function recentCopies(now = Date.now()): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(RATE_KEY);
    const all: number[] = raw ? JSON.parse(raw) : [];
    return all.filter((ts) => now - ts < 60_000);
  } catch {
    return [];
  }
}

// Returns a problem string when the user is over the limit, else null.
// Persisted so restarting the app doesn't reset the window.
export async function checkRateLimit(enabled: boolean): Promise<string | null> {
  if (!enabled) return null;
  const recent = await recentCopies();
  if (recent.length < RATE_LIMIT_PER_MINUTE) return null;
  const wait = Math.ceil((60_000 - (Date.now() - Math.min(...recent))) / 1000);
  return `Rate limit: ${RATE_LIMIT_PER_MINUTE} copies per minute. Try again in ${wait}s.`;
}

export async function recordCopy() {
  const recent = await recentCopies();
  await AsyncStorage.setItem(RATE_KEY, JSON.stringify([...recent, Date.now()])).catch(() => {});
}

// How far the market has moved from the trader's price, in %. Uses the side
// the copy would trade against: the ask for a buy, the bid for a sell.
export function driftPct(isBuy: boolean, copyPrice: number, book: { bid: number | null; ask: number | null }): number | null {
  const ref = isBuy ? book.ask : book.bid;
  if (ref === null || copyPrice <= 0) return null;
  return (Math.abs(ref - copyPrice) / copyPrice) * 100;
}

export function checkDrift(
  enabled: boolean,
  limitPct: number,
  isBuy: boolean,
  copyPrice: number,
  book: { bid: number | null; ask: number | null },
): string | null {
  if (!enabled) return null;
  const d = driftPct(isBuy, copyPrice, book);
  if (d === null) return "Order book is one-sided right now; can't check price drift.";
  if (d <= limitPct) return null;
  return `Price has moved ${d.toFixed(2)}% since this trade — more than your ${limitPct}% drift guard.`;
}
