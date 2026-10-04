import { encodeFunctionData, erc20Abi, formatUnits, parseAbi, parseUnits, zeroAddress, type Address, type Hex } from "viem";
import { publicClient } from "@/lib/monad";
import { KURU_MARGIN_ACCOUNT } from "./markets";
import { orderBookAbi, type MarketParams } from "./orderbook";

// Turns "copy this trade" into the exact Kuru transactions to sign: optional
// USDC approval, a deposit of only the shortfall into Kuru's margin account
// (limit orders draw from it, not from the wallet), then the limit order.
// Pure planning + reads — nothing here signs or sends.

export const marginAccountAbi = parseAbi([
  "function deposit(address _user, address _token, uint256 _amount) payable",
  "function withdraw(uint256 _amount, address _token)",
  "function getBalance(address _user, address _token) view returns (uint256)",
  "function batchWithdrawMaxTokens(address[] _tokens)",
]);

// Native MON left in the wallet for gas. Monad gas is cheap; this is generous.
export const GAS_RESERVE_MON = 2;

export type TxStep = {
  kind: "approve" | "deposit" | "order";
  label: string;
  to: Address;
  data: Hex;
  value: bigint;
};

export type CopyOrderPlan = {
  market: Address;
  isBuy: boolean;
  price: number; // after rounding to the tick, in the user's favour
  size: number; // after rounding to the size step
  quoteValue: number; // ≈ USDC
  priceRaw: bigint; // uint32 in market price precision
  sizeRaw: bigint; // uint96 in market size precision
  fundingToken: Address; // what the margin account must hold (USDC to buy, MON to sell)
  fundingSymbol: string;
  fundingNeeded: bigint; // token units
  marginBalance: bigint;
  walletBalance: bigint;
  steps: TxStep[];
  problems: string[]; // anything here means: don't let the user confirm
};

export type Balances = { wallet: bigint; margin: bigint; allowance: bigint; nativeWallet: bigint };

export async function readBalances(user: Address, token: Address): Promise<Balances> {
  const native = token === zeroAddress;
  const [wallet, margin, allowance, nativeWallet] = await Promise.all([
    native
      ? publicClient.getBalance({ address: user })
      : publicClient.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [user] }),
    publicClient.readContract({ address: KURU_MARGIN_ACCOUNT, abi: marginAccountAbi, functionName: "getBalance", args: [user, token] }),
    native
      ? Promise.resolve(BigInt(0))
      : publicClient.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [user, KURU_MARGIN_ACCOUNT] }),
    publicClient.getBalance({ address: user }),
  ]);
  return { wallet, margin, allowance, nativeWallet };
}

// Round a price to the market tick: down for buys, up for sells, so a copy
// never pays more (or sells for less) than the trader did.
export function quantizePrice(price: number, isBuy: boolean, params: MarketParams): bigint {
  const raw = parseUnits(price.toFixed(params.priceDecimals), params.priceDecimals);
  const tick = params.tickSize > BigInt(0) ? params.tickSize : BigInt(1);
  const down = (raw / tick) * tick;
  return isBuy || down === raw ? down : down + tick;
}

export function quantizeSize(size: number, params: MarketParams): bigint {
  // Truncate (never round up past what the user sized).
  const fixed = size.toFixed(params.sizeDecimals + 2);
  const [whole, frac = ""] = fixed.split(".");
  return parseUnits(`${whole}.${frac.slice(0, params.sizeDecimals)}`, params.sizeDecimals);
}

const ceilDiv = (a: bigint, b: bigint) => (a + b - BigInt(1)) / b;

export async function planCopyOrder(input: {
  user: Address;
  market: Address;
  isBuy: boolean;
  price: number;
  size: number;
  params: MarketParams;
  baseSymbol: string;
  quoteSymbol: string;
}): Promise<CopyOrderPlan> {
  const { user, market, isBuy, params } = input;
  const problems: string[] = [];

  const priceRaw = quantizePrice(input.price, isBuy, params);
  const sizeRaw = quantizeSize(input.size, params);
  const price = Number(formatUnits(priceRaw, params.priceDecimals));
  const size = Number(formatUnits(sizeRaw, params.sizeDecimals));

  if (sizeRaw < params.minSize) problems.push(`Below Kuru's minimum of ${formatUnits(params.minSize, params.sizeDecimals)} ${input.baseSymbol}.`);
  if (sizeRaw > params.maxSize) problems.push(`Above Kuru's maximum order size.`);
  if (priceRaw <= BigInt(0) || priceRaw >= BigInt(2) ** BigInt(32)) problems.push("Price is out of range for this market.");

  // What the margin account must hold for this order to rest:
  //   buy  → quote (USDC) = price × size (+ taker fee if it matches immediately)
  //   sell → base (MON, WETH…) = size
  const fundingToken = isBuy ? params.quoteAsset : params.baseAsset;
  const fundingSymbol = isBuy ? input.quoteSymbol : input.baseSymbol;
  let fundingNeeded: bigint;
  if (isBuy) {
    // price × size scaled from (priceDecimals + sizeDecimals) down to quote decimals, rounded up.
    const scale = BigInt(10) ** BigInt(params.priceDecimals + params.sizeDecimals - params.quoteDecimals);
    const notional = ceilDiv(priceRaw * sizeRaw, scale);
    fundingNeeded = notional + ceilDiv(notional * BigInt(params.takerFeeBps), BigInt(10_000));
  } else {
    fundingNeeded = sizeRaw * BigInt(10) ** BigInt(params.baseDecimals - params.sizeDecimals);
  }

  const bal = await readBalances(user, fundingToken);
  const shortfall = fundingNeeded > bal.margin ? fundingNeeded - bal.margin : BigInt(0);
  const reserve = parseUnits(String(GAS_RESERVE_MON), 18);
  const native = fundingToken === zeroAddress;
  // Selling spends the base token (MON, WETH, cbBTC…), buying spends USDC.
  const fundingDecimals = isBuy ? params.quoteDecimals : params.baseDecimals;
  const walletSpendable = native ? (bal.wallet > reserve ? bal.wallet - reserve : BigInt(0)) : bal.wallet;

  if (shortfall > walletSpendable) {
    const have = Number(formatUnits(bal.margin + walletSpendable, fundingDecimals));
    problems.push(`Not enough ${fundingSymbol}: this copy needs ${formatUnits(fundingNeeded, fundingDecimals)}, you have ${have.toFixed(fundingDecimals > 6 ? 4 : 2)} available${native ? ` (keeping ${GAS_RESERVE_MON} MON for gas)` : ""}.`);
  }
  if (!native && bal.nativeWallet < reserve) problems.push(`Keep at least ${GAS_RESERVE_MON} MON in your wallet for gas.`);

  const steps: TxStep[] = [];
  if (shortfall > BigInt(0)) {
    if (!native && bal.allowance < shortfall) {
      steps.push({
        kind: "approve",
        label: `Allow Kuru to use ${formatUnits(shortfall, fundingDecimals)} ${fundingSymbol}`,
        to: fundingToken,
        // Exact amount, never an unlimited approval.
        data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [KURU_MARGIN_ACCOUNT, shortfall] }),
        value: BigInt(0),
      });
    }
    steps.push({
      kind: "deposit",
      label: `Deposit ${formatUnits(shortfall, fundingDecimals)} ${fundingSymbol} to Kuru`,
      to: KURU_MARGIN_ACCOUNT,
      data: encodeFunctionData({ abi: marginAccountAbi, functionName: "deposit", args: [user, fundingToken, shortfall] }),
      value: native ? shortfall : BigInt(0),
    });
  }
  steps.push({
    kind: "order",
    label: `${isBuy ? "Buy" : "Sell"} ${size} ${input.baseSymbol} @ ${price} (limit)`,
    to: market,
    // postOnly=false: if the market is still at the trader's price the copy
    // fills now; otherwise it rests at that price. It never pays more.
    data: encodeFunctionData({
      abi: orderBookAbi,
      functionName: isBuy ? "addBuyOrder" : "addSellOrder",
      args: [Number(priceRaw), sizeRaw, false],
    }),
    value: BigInt(0),
  });

  return {
    market,
    isBuy,
    price,
    size,
    quoteValue: price * size,
    priceRaw,
    sizeRaw,
    fundingToken,
    fundingSymbol,
    fundingNeeded,
    marginBalance: bal.margin,
    walletBalance: bal.wallet,
    steps,
    problems,
  };
}
