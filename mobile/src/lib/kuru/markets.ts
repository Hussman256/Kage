import type { Address } from "viem";

// Mainnet addresses from docs.kuru.io/contracts/Contract-addresses, verified
// on-chain. (The SDK quickstart page lists different addresses — those are stale.)
export const KURU_MARGIN_ACCOUNT: Address = "0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5";
export const KURU_ROUTER: Address = "0xd651346d7c789536ebf06dc72aE3C8502cd695CC";

export type KuruMarket = {
  address: Address;
  pair: string;
  base: string;
  quote: string;
};

// Every Kuru market with Trade events on mainnet (sampled 2026-10-03; pairs
// read from getMarketParams + token symbol()). All quote in USDC, so PnL adds
// up across markets.
export const MARKETS: KuruMarket[] = [
  { address: "0x065C9d28E428A0db40191a54d33d5b7c71a9C394", pair: "MON/USDC", base: "MON", quote: "USDC" },
  { address: "0x40c49F171202F91ff5d2faE34c22dD2BFdD22aF0", pair: "cbBTC/USDC", base: "cbBTC", quote: "USDC" },
  { address: "0xa6aFD386135B7D41A6C40C525abC4A1019b0D132", pair: "WETH/USDC", base: "WETH", quote: "USDC" },
  { address: "0x851145eaeFdc37956B08dA829fa31722199F3f07", pair: "XAUt0/USDC", base: "XAUt0", quote: "USDC" },
];

export function marketByAddress(address: string) {
  return MARKETS.find((m) => m.address.toLowerCase() === address.toLowerCase());
}
