import { concat, encodePacked, keccak256, maxUint256, pad, toHex, type Address } from "viem";
import { publicClient } from "@/lib/monad";
import { KURU_MARGIN_ACCOUNT } from "./markets";
import type { CopyOrderPlan } from "./trading";

// Simulates a planned order against the live Kuru contract with the margin
// balance overridden to "enough", so the contract itself validates price,
// size, tick, and market state — without the user holding funds or signing.

// Same layout the Kuru SDK uses (utils/storageSlots.ts): balances live in a
// mapping at slot 1 keyed by keccak256(abi.encodePacked(owner, token)).
export function marginBalanceSlot(owner: Address, token: Address) {
  const accountKey = keccak256(encodePacked(["address", "address"], [owner, token]));
  return keccak256(concat([accountKey, pad(toHex(1), { size: 32 })]));
}

export type DryRunResult = { ok: true; gas: bigint } | { ok: false; reason: string };

export async function dryRunOrder(plan: CopyOrderPlan, user: Address): Promise<DryRunResult> {
  const order = plan.steps.find((s) => s.kind === "order");
  if (!order) return { ok: false, reason: "No order step in plan" };
  const funded = toHex(maxUint256 / BigInt(4), { size: 32 });
  const stateOverride = [
    { address: user, balance: maxUint256 / BigInt(4) },
    { address: KURU_MARGIN_ACCOUNT, stateDiff: [{ slot: marginBalanceSlot(user, plan.fundingToken), value: funded }] },
  ];
  try {
    await publicClient.call({ account: user, to: order.to, data: order.data, stateOverride });
    const gas = await publicClient.estimateGas({ account: user, to: order.to, data: order.data, stateOverride });
    return { ok: true, gas };
  } catch (e) {
    const reason = e instanceof Error ? ((e as { shortMessage?: string }).shortMessage ?? e.message) : String(e);
    return { ok: false, reason };
  }
}
