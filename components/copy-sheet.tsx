"use client";

import { useState } from "react";
import { copySize, RISK_DEFAULTS, type CopySize } from "@/lib/copy-sizing";
import { fmtAmount, fmtPrice } from "@/lib/format";

const RATIOS = [0.25, 0.5, 1, 2] as const;

export type CopySource = {
  who: string;
  label: string;
  isBuy: boolean;
  pair: string;
  base: string;
  size: number;
  price: number;
  age: string;
  minSize: number;
};

export function CopySheet({
  order,
  onClose,
  onConfirm,
}: {
  order: CopySource;
  onClose: () => void;
  onConfirm: (copy: CopySize & { ratio: number }) => void;
}) {
  const [ratio, setRatio] = useState<number>(RISK_DEFAULTS.ratio);
  const copy = copySize(order.size, order.price, ratio, {
    maxOrderQuote: RISK_DEFAULTS.maxOrderQuote,
    minSize: order.minSize,
  });
  const side = order.isBuy ? "BUY LIMIT" : "SELL LIMIT";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--scrim1), var(--scrim2))" }} onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-[34px] border-t px-5 pb-8 pt-3.5"
        style={{ background: "var(--panel)", borderColor: "rgba(131,110,249,.3)", boxShadow: "0 -30px 70px -20px var(--shadow1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}
      >
        <div className="mx-auto mb-5 h-1 w-11 rounded-full" style={{ background: "var(--a22)" }} />

        <div className="flex items-baseline justify-between">
          <h3 className="m-0 text-[25px] font-semibold tracking-tight">Copy this order</h3>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--ink5)" }}>SOURCE · {order.age} AGO</span>
        </div>

        <div className="mt-[18px] rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-[26px] w-[26px] rounded-lg" style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)" }} />
            <span className="text-[14.5px] font-semibold">{order.who}</span>
            <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px]" style={{ background: "rgba(131,110,249,.18)", color: "var(--purpInk)" }}>{order.label}</span>
          </div>
          <div className="mt-3.5 flex items-center gap-2.5">
            <span
              className="rounded px-2 py-1 font-mono text-[11px] font-semibold"
              style={order.isBuy ? { background: "var(--g16)", color: "var(--grn)" } : { background: "rgba(160,5,93,.18)", color: "var(--berryInk)" }}
            >
              {side}
            </span>
            <span className="text-[19px] font-semibold tracking-tight">{order.pair}</span>
          </div>
          <div className="tabular-nums mt-3.5 flex justify-between font-mono text-[12.5px]" style={{ color: "var(--ink3)" }}>
            <span>{fmtAmount(order.size)} {order.base}</span>
            <span>@ {fmtPrice(order.price)}</span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--ink5)" }}>YOUR RATIO</span>
          <span className="font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--purp)" }}>MAX {RISK_DEFAULTS.maxOrderQuote} USDC</span>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-2 font-mono text-[13px]">
          {RATIOS.map((r) => {
            const active = r === ratio;
            return (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className="flex h-[46px] items-center justify-center rounded-[13px]"
                style={active ? { background: "var(--purp)", color: "var(--inv)", fontWeight: 700 } : { border: "1px solid var(--a14)", color: "var(--ink3)" }}
              >
                {r * 100}%
              </button>
            );
          })}
        </div>

        <div className="mt-[18px] rounded-2xl border p-4" style={{ background: "linear-gradient(150deg, rgba(131,110,249,.16), rgba(131,110,249,.04))", borderColor: "rgba(131,110,249,.26)" }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--purpInk)" }}>YOUR SIZE</div>
              <div className="tabular-nums mt-1.5 font-mono text-[31px] font-semibold tracking-tight">{fmtAmount(copy.size)}</div>
            </div>
            <div className="text-right font-mono text-[11.5px] leading-relaxed" style={{ color: "var(--ink2)" }}>
              <div>{order.base}</div>
              <div>≈ {fmtAmount(copy.quoteValue)} USDC</div>
            </div>
          </div>
          {(copy.capped || copy.belowMin) && (
            <div className="mt-2.5 font-mono text-[10px] tracking-wide" style={{ color: copy.belowMin ? "var(--berryInk)" : "var(--ink4)" }}>
              {copy.belowMin
                ? `BELOW KURU MINIMUM OF ${fmtAmount(order.minSize)} ${order.base}`
                : `CAPPED AT YOUR MAX ORDER SIZE`}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 font-mono text-[11px]" style={{ color: "var(--ink4)" }}>
          <div className="flex justify-between"><span>AUTO-CANCEL IF SOURCE CANCELS</span><span style={{ color: "var(--grn)" }}>ON</span></div>
          <div className="flex justify-between"><span>CANCEL IF PRICE MOVES &gt;</span><span style={{ color: "var(--ink)" }}>{RISK_DEFAULTS.driftGuardPct}%</span></div>
          <div className="flex justify-between"><span>SIGNED BY</span><span style={{ color: "var(--ink)" }}>YOUR WALLET</span></div>
        </div>

        <button
          onClick={() => onConfirm({ ...copy, ratio })}
          disabled={copy.belowMin}
          className="mt-[18px] h-[60px] w-full rounded-[17px] text-[17px] font-semibold text-inv disabled:opacity-50"
          style={{ background: "var(--purp)", boxShadow: "0 16px 40px -12px rgba(131,110,249,.85)" }}
        >
          Confirm &amp; sign on Kuru
        </button>
      </div>
    </div>
  );
}
