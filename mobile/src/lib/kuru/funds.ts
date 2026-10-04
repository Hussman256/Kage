import { encodeFunctionData, formatUnits, type Address } from "viem";
import { publicClient } from "@/lib/monad";
import type { TxSender } from "./execute";
import { KURU_MARGIN_ACCOUNT, MARKETS } from "./markets";
import { getMarketParams } from "./orderbook";
import { marginAccountAbi } from "./trading";

// The user's funds sitting in Kuru's margin account (deposited for copies,
// plus proceeds of filled copies), and withdrawing them back to the wallet.

export type KuruFunds = { token: Address; symbol: string; amount: number }[];

// USDC plus every market's base token, once each.
async function fundTokens() {
  const all = await Promise.all(MARKETS.map(async (m) => ({ m, params: await getMarketParams(m.address) })));
  const tokens = new Map<string, { token: Address; symbol: string; decimals: number }>();
  for (const { m, params } of all) {
    tokens.set(params.quoteAsset.toLowerCase(), { token: params.quoteAsset, symbol: m.quote, decimals: params.quoteDecimals });
    tokens.set(params.baseAsset.toLowerCase(), { token: params.baseAsset, symbol: m.base, decimals: params.baseDecimals });
  }
  return [...tokens.values()];
}

export async function readKuruFunds(user: Address): Promise<KuruFunds> {
  const tokens = await fundTokens();
  return Promise.all(
    tokens.map(async ({ token, symbol, decimals }) => {
      const raw = await publicClient.readContract({
        address: KURU_MARGIN_ACCOUNT,
        abi: marginAccountAbi,
        functionName: "getBalance",
        args: [user, token],
      });
      return { token, symbol, amount: Number(formatUnits(raw, decimals)) };
    }),
  );
}

// Withdraws every listed token's full margin balance in one transaction.
// Funds locked in resting orders stay locked until those orders are cancelled.
export async function withdrawAllFunds(sender: TxSender, tokens: Address[]) {
  const hash = await sender.sendTransaction({
    to: KURU_MARGIN_ACCOUNT,
    data: encodeFunctionData({ abi: marginAccountAbi, functionName: "batchWithdrawMaxTokens", args: [tokens] }),
    value: BigInt(0),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error("Withdraw failed on-chain");
  return hash;
}
