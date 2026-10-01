// Sample data from the Kage design spec, for screens not yet wired to live
// sources (your book). Every screen rendering this must show a visible
// "sample data" badge.

export type OpenOrder = {
  side: "BUY" | "SELL";
  pair: string;
  size: string;
  price: string;
  filled: string;
  bar: number; // 0..1
  who: string;
  age: string;
  guard: string;
};

export const orders: OpenOrder[] = [
  { side: "BUY", pair: "MON/USDC", size: "625.00", price: "0.04180", filled: "100%", bar: 1, who: "shogun.mon", age: "12s", guard: "0.8%" },
  { side: "BUY", pair: "WMON/USDC", size: "320.00", price: "0.04052", filled: "42%", bar: 0.42, who: "kaze.mon", age: "4m", guard: "0.8%" },
  { side: "SELL", pair: "MON/USDC", size: "550.00", price: "0.04402", filled: "0%", bar: 0.03, who: "rin.mon", age: "9m", guard: "1.2%" },
  { side: "BUY", pair: "MON/USDC", size: "1,000.00", price: "0.04095", filled: "18%", bar: 0.18, who: "0xdeep…41a", age: "17m", guard: "0.5%" },
];
