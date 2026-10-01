import { useEffect, useState } from "react";
import type { Address } from "viem";
import { dryRunOrder, type DryRunResult } from "./dry-run";
import { checkDrift, checkRateLimit } from "./guards";
import { marketByAddress } from "./markets";
import { getBestBidAsk, getMarketParams, type MarketParams } from "./orderbook";
import { planCopyOrder, type CopyOrderPlan } from "./trading";

// Everything the copy sheet must know before it lets the user confirm.

// Stand-in owner for validating calldata against the contract when no wallet
// is signed in (preview). Never used to send anything.
const PREVIEW_USER: Address = "0x000000000000000000000000000000000000dEaD";

export type Preflight = {
  key: string;
  plan: CopyOrderPlan;
  params: MarketParams;
  dry: DryRunResult;
  problems: string[]; // blocking
};

export type PreflightInput = {
  market: Address;
  isBuy: boolean;
  price: number;
  size: number;
  user: Address | null;
  driftGuard: boolean;
  driftGuardPct: number;
  rateLimit: boolean;
};

export function usePreflight(input: PreflightInput | null) {
  const key = input ? JSON.stringify(input) : "";
  const [result, setResult] = useState<Preflight | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    (async () => {
      const market = marketByAddress(input.market);
      if (!market) throw new Error("Unknown market");
      const [params, book, rate] = await Promise.all([
        getMarketParams(input.market),
        getBestBidAsk(input.market),
        checkRateLimit(input.rateLimit),
      ]);
      const owner = input.user ?? PREVIEW_USER;
      const plan = await planCopyOrder({
        user: owner,
        market: input.market,
        isBuy: input.isBuy,
        price: input.price,
        size: input.size,
        params,
        baseSymbol: market.base,
        quoteSymbol: market.quote,
      });
      const dry = await dryRunOrder(plan, owner);
      // Without a wallet, balance problems are meaningless — keep the rest.
      const planProblems = input.user
        ? plan.problems
        : plan.problems.filter((p) => !p.startsWith("Not enough") && !p.startsWith("Keep at least"));
      const drift = checkDrift(input.driftGuard, input.driftGuardPct, input.isBuy, plan.price, book);
      const problems = [...planProblems, drift, rate].filter((p): p is string => !!p);
      if (!dry.ok && !planProblems.length) problems.push(`Kuru would reject this order: ${dry.reason.slice(0, 120)}`);
      if (!cancelled) setResult({ key, plan, params, dry, problems });
    })().catch((e) => {
      if (!cancelled) setError({ key, message: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      cancelled = true;
    };
    // `key` captures every field of `input`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result?.key === key ? result : null;
  return {
    preflight: current,
    checking: !!input && !current && error?.key !== key,
    error: error?.key === key ? error.message : null,
  };
}
