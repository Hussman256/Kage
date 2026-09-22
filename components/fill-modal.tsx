"use client";

import type { FeedOrder } from "@/lib/mock-data";

export function FillModal({ order, onClose }: { order: FeedOrder; onClose: () => void }) {
  const isBuy = order.side === "BUY LIMIT";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-inv" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div
        className="pointer-events-none absolute left-1/2 top-[120px] h-[600px] w-[600px] -translate-x-1/2"
        style={{ borderRadius: "50%", background: "radial-gradient(circle, var(--g16), var(--invT) 66%)" }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-7 text-center">
        <div
          className="flex h-[104px] w-[104px] items-center justify-center rounded-[32px] border text-[44px]"
          style={{ background: "var(--g12)", borderColor: "var(--g40)", color: "var(--grn)" }}
        >
          ✓
        </div>
        <div className="mt-7 text-[31px] font-semibold tracking-tight">Shadow filled</div>
        <div
          className="tabular-nums mt-3.5 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[13px]"
          style={{ background: "var(--g12)", borderColor: "var(--g35)", color: "var(--grn)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--grn)" }} />
          FILLED IN {Math.floor(300 + Math.random() * 250)} ms
        </div>
        <div className="mt-3 font-mono text-[10px] tracking-[.08em]" style={{ color: "var(--ink6)" }}>
          SIMULATED · WILL READ MONAD EXECUTION EVENTS ONCE KURU IS WIRED IN
        </div>

        <div className="mt-8 flex w-full flex-col gap-3.5 rounded-2xl border p-5 text-left font-mono text-[12.5px]" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
          <div className="flex justify-between"><span style={{ color: "var(--ink5)" }}>PAIR</span><span>{order.pair}</span></div>
          <div className="flex justify-between"><span style={{ color: "var(--ink5)" }}>SIDE</span><span style={{ color: isBuy ? "var(--grn)" : "var(--berryInk)" }}>{order.side}</span></div>
          <div className="tabular-nums flex justify-between"><span style={{ color: "var(--ink5)" }}>FILLED</span><span>{order.size} @ {order.price}</span></div>
          <div className="tabular-nums flex justify-between"><span style={{ color: "var(--ink5)" }}>SLIPPAGE VS SOURCE</span><span>0.00%</span></div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 42px)" }}>
        <button onClick={onClose} className="h-14 rounded-2xl text-[16px] font-semibold text-inv" style={{ background: "var(--purp)" }}>
          Back to feed
        </button>
        <button className="h-[52px] rounded-2xl border text-[15px] font-medium" style={{ borderColor: "var(--a16)", color: "var(--ink2)" }} disabled>
          Share into room ↗
        </button>
      </div>
    </div>
  );
}
