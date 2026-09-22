"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { use } from "react";
import { SampleDataBadge } from "@/components/sample-data-badge";

const LABEL_HISTORY = [
  { date: "SEP 04", note: <>Granted <strong className="font-semibold text-ink">90D Smart Trader</strong> on Monad</>, strong: true },
  { date: "AUG 27", note: <>Bought MON/USDC bottom at <span className="font-mono">0.0412</span>, +22% in 9h</>, strong: false },
  { date: "AUG 12", note: "142 resting limit orders on Kuru, 0 liquidations", strong: false },
];

export default function TraderDetailPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const router = useRouter();
  const [following, setFollowing] = useState(false);

  return (
    <main className="relative min-h-dvh bg-inv pb-8" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px]"
        style={{ background: "linear-gradient(170deg, rgba(131,110,249,.26), var(--invT))" }}
      />

      <div className="relative px-5 pt-5">
        <button
          onClick={() => router.back()}
          className="font-mono text-[12px]"
          style={{ color: "var(--ink3)" }}
        >
          ← SMART MONEY
        </button>

        <div className="mt-[22px] flex items-center gap-4">
          <div
            className="h-[66px] w-[66px] flex-shrink-0 rounded-[19px]"
            style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)", boxShadow: "0 0 0 1px var(--a14)" }}
          />
          <div>
            <div className="text-[26px] font-semibold tracking-tight">{decodeURIComponent(handle)}</div>
            <div className="mt-1.5 font-mono text-[11.5px]" style={{ color: "var(--ink4)" }}>0x7a3f…9c21</div>
          </div>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-1.5 font-mono text-[10px] tracking-wide">
          <span className="rounded-md px-2.5 py-1.5" style={{ background: "rgba(131,110,249,.2)", color: "var(--purpInk)" }}>90D SMART TRADER</span>
          <span className="rounded-md px-2.5 py-1.5" style={{ background: "rgba(131,110,249,.2)", color: "var(--purpInk)" }}>SMART TRADER</span>
          <span className="rounded-md px-2.5 py-1.5" style={{ background: "rgba(160,5,93,.22)", color: "var(--berryInk)" }}>HIGH FREQUENCY</span>
        </div>

        <SampleDataBadge label="SAMPLE STATS · NOT LIVE" />

        <div className="mt-[22px] grid grid-cols-3 gap-2.5">
          {[
            { label: "WIN RATE", value: "71%", color: "var(--ink)" },
            { label: "90D PNL", value: "+38%", color: "var(--grn)" },
            { label: "AVG HOLD", value: "4h", color: "var(--ink)" },
          ].map((s) => (
            <div key={s.label} className="rounded-[15px] border p-3.5" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
              <div className="font-mono text-[9.5px] tracking-wide" style={{ color: "var(--ink5)" }}>{s.label}</div>
              <div className="tabular-nums mt-2 font-mono text-[22px] font-semibold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3.5 rounded-2xl border p-4" style={{ background: "var(--panel)", borderColor: "var(--a08)" }}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--ink5)" }}>EQUITY CURVE · 90D</span>
            <span className="font-mono text-[10px]" style={{ color: "var(--grn)" }}>+38.4%</span>
          </div>
          <svg viewBox="0 0 300 74" preserveAspectRatio="none" className="mt-3 block h-[74px] w-full">
            <polyline points="0,62 26,58 52,49 78,54 104,41 130,44 156,31 182,34 208,22 234,25 260,13 300,8" fill="none" stroke="var(--purp)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-[18px]">
          <div className="mb-3 font-mono text-[10px] tracking-[.1em]" style={{ color: "var(--ink5)" }}>LABEL HISTORY &amp; NOTABLE FILLS</div>
          <div className="flex flex-col gap-2.5">
            {LABEL_HISTORY.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-12 flex-shrink-0 pt-0.5 font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>{h.date}</span>
                <span
                  className="mt-1 h-1.5 w-1.5 flex-shrink-0 rotate-45"
                  style={{ background: h.strong ? "var(--purp)" : "rgba(131,110,249,.45)" }}
                />
                <span className="text-[13.5px]" style={{ color: "var(--ink2)" }}>{h.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="sticky bottom-0 mt-6 flex gap-2.5 px-5 pt-4"
        style={{ background: "linear-gradient(to top, var(--inv) 62%, var(--invT))", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <button
          onClick={() => setFollowing((f) => !f)}
          className="h-14 flex-1 rounded-2xl text-[16px] font-semibold text-inv"
          style={
            following
              ? { border: "1px solid var(--a16)", background: "transparent", color: "var(--ink2)" }
              : { background: "var(--purp)", boxShadow: "0 14px 34px -12px rgba(131,110,249,.8)" }
          }
        >
          {following ? "Following shadow ✓" : "Follow shadow"}
        </button>
      </div>
    </main>
  );
}
