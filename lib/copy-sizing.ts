// Risk defaults from the design. Not persisted yet — the Risk screen edits
// local state only; these become per-user settings when that's wired.
export const RISK_DEFAULTS = {
  maxOrderQuote: 400, // USDC
  ratio: 0.5,
  driftGuardPct: 0.8,
};

export type CopySize = {
  size: number; // base units, e.g. MON
  quoteValue: number; // ≈ USDC
  capped: boolean; // hit the user's max order size
  belowMin: boolean; // under the market's minimum order size
};

export function copySize(
  sourceSize: number,
  price: number,
  ratio: number,
  opts: { maxOrderQuote: number; minSize: number },
): CopySize {
  let size = sourceSize * ratio;
  let capped = false;
  if (price > 0 && size * price > opts.maxOrderQuote) {
    size = opts.maxOrderQuote / price;
    capped = true;
  }
  return { size, quoteValue: size * price, capped, belowMin: size < opts.minSize };
}
