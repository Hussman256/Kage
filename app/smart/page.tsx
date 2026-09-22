"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { SampleDataBadge } from "@/components/sample-data-badge";
import { traders } from "@/lib/mock-data";

const WINDOWS = ["30D", "90D", "180D", "FUNDS"] as const;

export default function SmartMoneyPage() {
  const [activeWindow, setActiveWindow] = useState<(typeof WINDOWS)[number]>("90D");

  return (
    <main className="min-h-dvh bg-inv pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-3.5 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="m-0 text-[30px] font-semibold tracking-tight">Smart money</h1>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] tracking-[.08em]" style={{ color: "var(--ink5)" }}>
              POWERED BY NANSEN · MONAD
              <span className="h-[5px] w-[5px] animate-kage-pulse rounded-full" style={{ background: "var(--grn)" }} />
              LIVE
            </div>
          </div>
          <div
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border text-[15px]"
            style={{ borderColor: "var(--a14)", color: "var(--ink3)" }}
          >
            ⌕
          </div>
        </div>
        <div className="mt-[18px] flex gap-2 font-mono text-[11.5px]">
          {WINDOWS.map((w) => {
            const active = w === activeWindow;
            return (
              <button
                key={w}
                onClick={() => setActiveWindow(w)}
                className="rounded-full px-3.5 py-2 font-semibold transition-colors"
                style={
                  active
                    ? { background: "var(--purp)", color: "var(--inv)" }
                    : { border: "1px solid var(--a15)", color: "var(--ink3)" }
                }
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>

      <SampleDataBadge />

      <div className="flex flex-col gap-3 px-5">
        {traders.map((t) => (
          <Link key={t.handle} href={`/trader/${encodeURIComponent(t.handle)}`} className="relative block">
            <div
              className="absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-2xl"
              style={{ background: "var(--rowShadow)" }}
            />
            <div
              className="relative flex items-center gap-3.5 rounded-2xl border p-4"
              style={{ background: "var(--card)", borderColor: "var(--a09)" }}
            >
              <div className="w-[18px] font-mono text-[13px]" style={{ color: "var(--ink6)" }}>
                {t.rank}
              </div>
              <div
                className="h-[38px] w-[38px] flex-shrink-0 rounded-[11px]"
                style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold tracking-tight">{t.handle}</span>
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide"
                    style={{ background: "rgba(131,110,249,.18)", color: "var(--purpInk)" }}
                  >
                    {t.label}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--ink5)" }}>
                  {t.addr} · {t.trades} fills / 7d
                </div>
              </div>
              <div className="text-right">
                <div className="tabular-nums font-mono text-[15px] font-semibold" style={{ color: "var(--grn)" }}>
                  {t.pnl}
                </div>
                <div className="mt-1 font-mono text-[10.5px]" style={{ color: "var(--ink5)" }}>
                  WIN {t.win}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
