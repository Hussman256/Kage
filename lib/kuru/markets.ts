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
  // Display decimals, not on-chain precision (that comes from getMarketParams).
  priceDecimals: number;
};

export const MARKETS: KuruMarket[] = [
  {
    address: "0x065C9d28E428A0db40191a54d33d5b7c71a9C394",
    pair: "MON/USDC",
    base: "MON",
    quote: "USDC",
    priceDecimals: 5,
  },
];

export function marketByAddress(address: string) {
  return MARKETS.find((m) => m.address.toLowerCase() === address.toLowerCase());
}
