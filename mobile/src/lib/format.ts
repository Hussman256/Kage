export const fmtAmount = (n: number, decimals = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Precision follows magnitude, so one formatter fits MON (~0.03) and cbBTC
// (~85,000): "0.031066", "2.4100", "84773.26".
export const fmtPrice = (n: number) => n.toFixed(Math.abs(n) >= 100 ? 2 : Math.abs(n) >= 1 ? 4 : 6);

// Base-asset sizes: "1,250.00" MON, "2.500" WETH, "0.000125" cbBTC.
export const fmtSize = (n: number) => fmtAmount(n, Math.abs(n) >= 100 ? 2 : Math.abs(n) >= 1 ? 3 : 6);

// "+$32.71" / "−$4.10"
export const fmtSignedUsd = (n: number) => `${n >= 0 ? "+" : "−"}$${fmtAmount(Math.abs(n))}`;

// "$8.1K", "$940"
export function fmtCompactUsd(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-3)}`;

export function fmtAge(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
