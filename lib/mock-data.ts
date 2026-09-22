// Sample/placeholder data only — lifted from the Kage.dc.html design spec.
// Replaced by live Envio-indexed Kuru data + Nansen scoring in a later build pass.
// Every screen that renders this must show a visible "sample data" indicator.

export type Trader = {
  rank: string;
  handle: string;
  addr: string;
  label: string;
  pnl: string;
  win: string;
  trades: string;
};

export type FeedOrder = {
  who: string;
  label: string;
  side: "BUY LIMIT" | "SELL LIMIT";
  pair: string;
  size: string;
  price: string;
  age: string;
};

export type OpenOrder = {
  side: "BUY" | "SELL";
  pair: string;
  size: string;
  price: string;
  filled: string;
  bar: string;
  who: string;
  age: string;
  guard: string;
};

export const traders: Trader[] = [
  { rank: "01", handle: "shogun.mon", addr: "0x7a3f…9c21", label: "90D SMART", pnl: "+38.4%", win: "71%", trades: "142" },
  { rank: "02", handle: "0xdeep…41a", addr: "0xdeep…41a", label: "FUND", pnl: "+31.7%", win: "68%", trades: "96" },
  { rank: "03", handle: "tessellate.mon", addr: "0x1b8c…77de", label: "SMART TRADER", pnl: "+24.9%", win: "64%", trades: "311" },
  { rank: "04", handle: "kaze.mon", addr: "0x5f02…a1b4", label: "30D SMART", pnl: "+19.2%", win: "61%", trades: "84" },
  { rank: "05", handle: "rin.mon", addr: "0xc4d7…3f08", label: "180D SMART", pnl: "+16.5%", win: "59%", trades: "47" },
  { rank: "06", handle: "0xmaki…9b2", addr: "0xmaki…9b2", label: "SMART TRADER", pnl: "+11.8%", win: "57%", trades: "128" },
];

export const feed: FeedOrder[] = [
  { who: "shogun.mon", label: "90D SMART", side: "BUY LIMIT", pair: "MON/USDC", size: "1,250.00 MON", price: "0.04180", age: "8s" },
  { who: "tessellate.mon", label: "SMART", side: "SELL LIMIT", pair: "WMON/USDC", size: "820.00 WMON", price: "0.04310", age: "41s" },
  { who: "0xdeep…41a", label: "FUND", side: "BUY LIMIT", pair: "MON/USDC", size: "4,000.00 MON", price: "0.04095", age: "2m" },
  { who: "kaze.mon", label: "30D SMART", side: "BUY LIMIT", pair: "WMON/USDC", size: "640.00 WMON", price: "0.04052", age: "6m" },
  { who: "rin.mon", label: "180D SMART", side: "SELL LIMIT", pair: "MON/USDC", size: "1,100.00 MON", price: "0.04402", age: "11m" },
];

export const orders: OpenOrder[] = [
  { side: "BUY", pair: "MON/USDC", size: "625.00", price: "0.04180", filled: "100%", bar: "100%", who: "shogun.mon", age: "12s", guard: "0.8%" },
  { side: "BUY", pair: "WMON/USDC", size: "320.00", price: "0.04052", filled: "42%", bar: "42%", who: "kaze.mon", age: "4m", guard: "0.8%" },
  { side: "SELL", pair: "MON/USDC", size: "550.00", price: "0.04402", filled: "0%", bar: "3%", who: "rin.mon", age: "9m", guard: "1.2%" },
  { side: "BUY", pair: "MON/USDC", size: "1,000.00", price: "0.04095", filled: "18%", bar: "18%", who: "0xdeep…41a", age: "17m", guard: "0.5%" },
];
