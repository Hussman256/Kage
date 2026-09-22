"use client";

import { BottomNav } from "@/components/bottom-nav";
import { SampleDataBadge } from "@/components/sample-data-badge";

export default function RoomsPage() {
  return (
    <main className="min-h-dvh bg-inv pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-1 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-[30px] font-semibold tracking-tight">Dojo</h1>
          <button
            className="rounded-full border px-3.5 py-2 font-mono text-[11px]"
            style={{ color: "var(--purp)", borderColor: "rgba(131,110,249,.4)" }}
          >
            + NEW ROOM
          </button>
        </div>

        <SampleDataBadge label="SAMPLE ROOM · P1, NOT WIRED UP" />

        <div
          className="mt-1 rounded-[22px] border p-5"
          style={{ background: "linear-gradient(150deg, rgba(131,110,249,.2), rgba(160,5,93,.12))", borderColor: "rgba(131,110,249,.3)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[21px] font-semibold tracking-tight">Night Watch</div>
              <div className="mt-1.5 font-mono text-[11px]" style={{ color: "var(--ink2)" }}>CODE KAGE-7F2 · 12 MEMBERS</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9.5px] tracking-wide" style={{ color: "var(--ink2)" }}>ROOM PNL 7D</div>
              <div className="tabular-nums mt-1 font-mono text-[21px] font-semibold" style={{ color: "var(--grn2)" }}>+12.4%</div>
            </div>
          </div>
          <div className="mt-[18px] flex items-center">
            <div className="h-[30px] w-[30px] rounded-[9px]" style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)", boxShadow: "0 0 0 2px var(--ring)" }} />
            <div className="-ml-2.5 h-[30px] w-[30px] rounded-[9px]" style={{ background: "linear-gradient(140deg, #A0055D, var(--purp))", boxShadow: "0 0 0 2px var(--ring)" }} />
            <div className="-ml-2.5 h-[30px] w-[30px] rounded-[9px]" style={{ background: "linear-gradient(140deg, var(--purpAlt), #A0055D)", boxShadow: "0 0 0 2px var(--ring)" }} />
            <div
              className="-ml-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-[9px] font-mono text-[10px]"
              style={{ background: "var(--a14)", boxShadow: "0 0 0 2px var(--ring)" }}
            >
              +9
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-3.5 font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--ink5)" }}>SHARED WATCHLIST</div>
        <div className="flex flex-wrap gap-2">
          {["shogun.mon", "0xdeep…41a", "tessellate.mon"].map((h) => (
            <span key={h} className="rounded-[10px] border px-3.5 py-2 font-mono text-[11.5px]" style={{ background: "var(--card)", borderColor: "var(--a10)" }}>
              {h}
            </span>
          ))}
        </div>

        <div className="mb-3.5 mt-6 font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--ink5)" }}>SETUPS SHARED</div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold">rin.mon shared a setup</span>
              <span className="font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>3m</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold" style={{ background: "var(--g16)", color: "var(--grn)" }}>BUY</span>
              <span className="text-[15px] font-semibold">WMON/USDC</span>
              <span className="tabular-nums font-mono text-[12px]" style={{ color: "var(--ink3)" }}>@ 0.04052</span>
            </div>
            <div className="mt-3.5 flex gap-2.5">
              <button className="h-10 flex-1 rounded-[11px] text-[14px] font-semibold text-inv" style={{ background: "var(--purp)" }}>Copy setup</button>
              <button className="h-10 rounded-[11px] border px-3.5 font-mono text-[12px]" style={{ borderColor: "var(--a16)", color: "var(--ink2)" }}>DETAIL</button>
            </div>
          </div>
          <div className="rounded-2xl border p-4 opacity-70" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold">kaze.mon copied shogun.mon</span>
              <span className="font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>18m</span>
            </div>
            <div className="tabular-nums mt-3 font-mono text-[12px]" style={{ color: "var(--ink3)" }}>
              312.50 MON @ 0.04180 · FILLED 388ms
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
