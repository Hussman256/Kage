"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { SampleDataBadge } from "@/components/sample-data-badge";
import { orders } from "@/lib/mock-data";

const TABS = ["Open · 4", "Filled", "Cancelled"] as const;

export default function BookPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Open · 4");

  return (
    <main className="min-h-dvh bg-inv pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-3.5 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-[30px] font-semibold tracking-tight">Your book</h1>
          <Link href="/risk" className="flex h-9 w-9 items-center justify-center rounded-xl border text-[15px]" style={{ borderColor: "var(--a14)", color: "var(--ink3)" }}>
            ⚙
          </Link>
        </div>
        <div className="mt-4 flex gap-5 border-b" style={{ borderColor: "var(--a10)" }}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="pb-3 text-[14.5px]"
                style={active ? { fontWeight: 600, borderBottom: "2px solid var(--purp)" } : { fontWeight: 400, color: "var(--ink5)" }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[15px] border p-3.5" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
            <div className="font-mono text-[9.5px] tracking-wide" style={{ color: "var(--ink5)" }}>COPY PNL · 7D</div>
            <div className="tabular-nums mt-2 font-mono text-[24px] font-semibold" style={{ color: "var(--grn)" }}>+84.21</div>
          </div>
          <div className="rounded-[15px] border p-3.5" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
            <div className="font-mono text-[9.5px] tracking-wide" style={{ color: "var(--ink5)" }}>AVG FILL</div>
            <div className="tabular-nums mt-2 font-mono text-[24px] font-semibold">468ms</div>
          </div>
        </div>
      </div>

      <SampleDataBadge />

      <div className="flex flex-col gap-2.5 px-5">
        {orders.map((o, i) => {
          const isBuy = o.side === "BUY";
          return (
            <div key={i} className="rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold"
                    style={isBuy ? { background: "var(--g16)", color: "var(--grn)" } : { background: "rgba(160,5,93,.18)", color: "var(--berryInk)" }}
                  >
                    {o.side}
                  </span>
                  <span className="text-[15.5px] font-semibold tracking-tight">{o.pair}</span>
                </div>
                <span className="font-mono text-[10.5px]" style={{ color: "var(--ink5)" }}>{o.age}</span>
              </div>
              <div className="tabular-nums mt-3 flex items-center justify-between font-mono text-[12px]">
                <span style={{ color: "var(--ink3)" }}>{o.size} @ {o.price}</span>
                <span style={{ color: "var(--ink2)" }}>{o.filled} filled</span>
              </div>
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-full" style={{ background: "var(--a10)" }}>
                <div className="h-[3px] rounded-full" style={{ background: "var(--purp)", width: o.bar }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-wide" style={{ color: "var(--ink6)" }}>
                  SHADOWING {o.who} · GUARD {o.guard}
                </span>
                <button className="font-mono text-[11px]" style={{ color: "var(--berryInk)" }}>CANCEL</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 pt-5">
        <button
          className="h-[50px] w-full rounded-2xl border font-mono text-[12.5px] tracking-[.1em]"
          style={{ borderColor: "rgba(160,5,93,.5)", background: "rgba(160,5,93,.14)", color: "var(--berryInk)" }}
        >
          CANCEL ALL COPIES
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
