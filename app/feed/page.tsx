"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SampleDataBadge } from "@/components/sample-data-badge";
import { CopySheet } from "@/components/copy-sheet";
import { FillModal } from "@/components/fill-modal";
import { feed, type FeedOrder } from "@/lib/mock-data";

export default function FeedPage() {
  const [copying, setCopying] = useState<FeedOrder | null>(null);
  const [filled, setFilled] = useState<FeedOrder | null>(null);

  return (
    <main className="min-h-dvh bg-inv pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-[30px] font-semibold tracking-tight">Feed</h1>
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px]"
            style={{ color: "var(--grn)", borderColor: "var(--g30)" }}
          >
            <span className="h-1.5 w-1.5 animate-kage-pulse rounded-full" style={{ background: "var(--grn)" }} />
            BLOCK 8,442,119
          </div>
        </div>
        <div className="mt-2.5 font-mono text-[11.5px]" style={{ color: "var(--ink5)" }}>
          6 shadows followed · MON/USDC · WMON/USDC
        </div>
      </div>

      <SampleDataBadge />

      <div className="flex flex-col gap-3 px-5">
        {feed.map((f, i) => {
          const isBuy = f.side === "BUY LIMIT";
          return (
            <div key={i} className="rounded-[20px] border p-4" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-[26px] w-[26px] rounded-lg" style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)" }} />
                  <span className="text-[14px] font-semibold">{f.who}</span>
                  <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px]" style={{ background: "rgba(131,110,249,.18)", color: "var(--purpInk)" }}>{f.label}</span>
                </div>
                <span className="font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>{f.age}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="rounded px-2 py-1 font-mono text-[11px] font-semibold"
                      style={isBuy ? { background: "var(--g16)", color: "var(--grn)" } : { background: "rgba(160,5,93,.18)", color: "var(--berryInk)" }}
                    >
                      {f.side}
                    </span>
                    <span className="text-[17px] font-semibold tracking-tight">{f.pair}</span>
                  </div>
                  <div className="tabular-nums mt-2.5 font-mono text-[12.5px]" style={{ color: "var(--ink3)" }}>
                    {f.size} @ {f.price}
                  </div>
                </div>
                <button
                  onClick={() => setCopying(f)}
                  className="h-10 rounded-xl px-5 text-[14.5px] font-semibold text-inv"
                  style={{ background: "var(--purp)" }}
                >
                  Copy
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {copying && (
        <CopySheet
          order={copying}
          onClose={() => setCopying(null)}
          onConfirm={() => {
            setFilled(copying);
            setCopying(null);
          }}
        />
      )}
      {filled && <FillModal order={filled} onClose={() => setFilled(null)} />}

      <BottomNav />
    </main>
  );
}
