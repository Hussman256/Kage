// Heuristics for wallets that aren't people, shared by the leaderboard and
// the live feed. Until Nansen labels are wired, this is Kage's only curation.
//
// 1. Market makers: anyone seen as a Trade maker (handled where trades are
//    parsed, since it needs the maker address).
// 2. Vanity addresses: 4+ leading zero hex digits. A random address starts
//    with "0x0000" ~1 in 65,536 times; arbitrage bots grind for them because
//    zero bytes make calldata cheaper.
// 3. Machine-speed takers: flagged by the leaderboard when a wallet makes
//    HIGH_FREQ_FILLS_PER_HOUR or more fills in its window.

export const HIGH_FREQ_FILLS_PER_HOUR = 100;

export const isVanityAddress = (address: string) => /^0x0000/i.test(address);

const highFrequency = new Set<string>();

export function flagHighFrequency(address: string) {
  highFrequency.add(address.toLowerCase());
}

export function isLikelyBot(address: string) {
  return isVanityAddress(address) || highFrequency.has(address.toLowerCase());
}
