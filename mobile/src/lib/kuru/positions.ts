import { encodeFunctionData, type Address } from "viem";
import type { CopyRecord } from "@/lib/copies";
import { getMarketParams, getOrderRemaining, orderBookAbi } from "./orderbook";
import type { TxSender } from "./execute";
import { publicClient } from "@/lib/monad";

// Live status of the user's copies, read from Kuru, plus cancelling them.
// Kage can't sign in the background (non-custodial, passkey per tx), so the
// expiry and drift guards *flag* stale copies for a one-tap cancel.

export const EXPIRY_MS = 10 * 60_000;

export type CopyStatus = {
  remaining: number; // still resting, base units
  filled: number; // base units filled so far
  closed: boolean; // nothing left resting (filled, or cancelled)
};

// For each open copy with a resting order, read what's left on the book.
export async function readCopyStatus(copies: CopyRecord[]): Promise<Map<string, CopyStatus>> {
  const out = new Map<string, CopyStatus>();
  await Promise.all(
    copies.map(async (c) => {
      if (c.status !== "open" || !c.orderId) return;
      const params = await getMarketParams(c.market as Address);
      const { owner, remaining } = await getOrderRemaining(c.market as Address, BigInt(c.orderId), params);
      // An order id can be reused only after deletion; if the owner differs
      // the user's order is gone.
      const mine = remaining > 0 && owner.toLowerCase() !== "0x0000000000000000000000000000000000000000";
      const left = mine ? remaining : 0;
      out.set(c.id, { remaining: left, filled: Math.max(0, c.size - left), closed: left === 0 });
    }),
  );
  return out;
}

export const isExpired = (c: CopyRecord, now: number) => c.status === "open" && now - c.createdAt > EXPIRY_MS;

// Cancels resting copies in one tx per market (Kuru's batchCancelOrders is
// idempotent, so including an already-filled id is harmless).
export async function cancelCopies(copies: CopyRecord[], sender: TxSender): Promise<string[]> {
  const byMarket = new Map<string, bigint[]>();
  for (const c of copies) {
    if (!c.orderId) continue;
    byMarket.set(c.market, [...(byMarket.get(c.market) ?? []), BigInt(c.orderId)]);
  }
  const cancelled: string[] = [];
  for (const [market, ids] of byMarket) {
    const hash = await sender.sendTransaction({
      to: market as Address,
      data: encodeFunctionData({ abi: orderBookAbi, functionName: "batchCancelOrders", args: [ids.map(Number)] }),
      value: BigInt(0),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") throw new Error("Cancel failed on-chain");
    cancelled.push(...copies.filter((c) => c.market === market).map((c) => c.id));
  }
  return cancelled;
}
