import { decodeEventLog, type Address, type Hash, type Hex } from "viem";
import { publicClient } from "@/lib/monad";
import { orderBookAbi, sizeAmount, type MarketParams } from "./orderbook";
import type { CopyOrderPlan, TxStep } from "./trading";

// Sends a planned copy, step by step, from the user's own wallet. The sender
// is injected (Privy's embedded wallet in the real app) so this module never
// touches keys — every step is signed by the user.

export type TxSender = {
  address: Address;
  sendTransaction: (tx: { to: Address; data: Hex; value: bigint }) => Promise<Hash>;
};

export type CopyResult = {
  orderTx: Hash;
  orderId: bigint | null; // set when part of the order rests on the book
  filledSize: number; // base units filled immediately
  restingSize: number; // base units left on the book
  stepTxs: { step: TxStep; hash: Hash }[];
};

export class CopyStepError extends Error {
  constructor(
    public step: TxStep,
    message: string,
    public hash?: Hash,
  ) {
    super(message);
  }
}

export async function executeCopy(
  plan: CopyOrderPlan,
  params: MarketParams,
  sender: TxSender,
  onStep?: (step: TxStep, state: "signing" | "confirming" | "done") => void,
): Promise<CopyResult> {
  if (plan.problems.length) throw new Error(plan.problems[0]);
  const stepTxs: CopyResult["stepTxs"] = [];
  let orderTx: Hash | null = null;

  for (const step of plan.steps) {
    onStep?.(step, "signing");
    let hash: Hash;
    try {
      hash = await sender.sendTransaction({ to: step.to, data: step.data, value: step.value });
    } catch (e) {
      throw new CopyStepError(step, e instanceof Error ? e.message : String(e));
    }
    onStep?.(step, "confirming");
    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    } catch {
      // Sent but unconfirmed: it may still land, so don't claim it failed.
      throw new CopyStepError(step, "UNCONFIRMED", hash);
    }
    if (receipt.status !== "success") throw new CopyStepError(step, `${step.label} failed on-chain`, hash);
    stepTxs.push({ step, hash });
    onStep?.(step, "done");
    if (step.kind === "order") orderTx = hash;
  }

  if (!orderTx) throw new Error("Plan had no order step");
  const receipt = await publicClient.getTransactionReceipt({ hash: orderTx });

  // OrderCreated (owner = user) → the resting remainder; Trade (txOrigin =
  // user) → what filled immediately against the book.
  let orderId: bigint | null = null;
  let restingSize = 0;
  let filledSize = 0;
  const me = sender.address.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== plan.market.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: orderBookAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "OrderCreated" && ev.args.owner.toLowerCase() === me) {
        orderId = BigInt(ev.args.orderId);
        restingSize = sizeAmount(ev.args.size, params);
      } else if (ev.eventName === "Trade" && ev.args.txOrigin.toLowerCase() === me) {
        filledSize += sizeAmount(ev.args.filledSize, params);
      }
    } catch {
      // Not an OrderBook event we care about.
    }
  }

  return { orderTx, orderId, filledSize, restingSize, stepTxs };
}
