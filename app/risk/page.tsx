"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/theme-provider";

const RATIOS = ["25%", "50%", "100%", "200%"] as const;

function Toggle({ on }: { on: boolean }) {
  return (
    <div className="h-[27px] w-[46px] flex-shrink-0 rounded-full relative" style={{ background: on ? "var(--purp)" : "var(--a16)" }}>
      <div
        className="absolute top-[3px] h-[21px] w-[21px] rounded-full"
        style={{ background: on ? "var(--inv)" : "var(--ink)", [on ? "right" : "left"]: "3px" } as React.CSSProperties}
      />
    </div>
  );
}

export default function RiskPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>("50%");
  const [autoCancel, setAutoCancel] = useState(true);
  const [driftGuard, setDriftGuard] = useState(true);
  const [rateLimit, setRateLimit] = useState(true);
  const [paperMode, setPaperMode] = useState(false);

  return (
    <main className="min-h-dvh bg-inv pb-10" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-1 pt-6">
        <button onClick={() => router.back()} className="font-mono text-[12px]" style={{ color: "var(--ink3)" }}>← BACK</button>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="m-0 text-[30px] font-semibold tracking-tight">Risk</h1>
          <button
            onClick={toggleTheme}
            className="rounded-full border px-1 py-1 font-mono text-[11px] tracking-wide"
            style={{ borderColor: "var(--a16)" }}
          >
            <span className="rounded-full px-3 py-1.5" style={theme === "dark" ? { background: "var(--purp)", color: "var(--inv)" } : { color: "var(--ink5)" }}>DARK</span>
            <span className="rounded-full px-3 py-1.5" style={theme === "light" ? { background: "var(--purp)", color: "var(--inv)" } : { color: "var(--ink5)" }}>LIGHT</span>
          </button>
        </div>
        <p className="mt-2.5 text-[14px] font-light leading-snug" style={{ color: "var(--ink4)" }}>
          These limits apply to every copy, on every shadow you follow.
        </p>
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-4">
        <div className="rounded-[20px] border p-[18px]" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[14.5px] font-medium">Max order size</span>
            <span className="tabular-nums font-mono text-[17px] font-semibold">400 USDC</span>
          </div>
          <div className="relative mt-4 h-[5px] rounded-full" style={{ background: "var(--a10)" }}>
            <div className="absolute left-0 top-0 h-[5px] w-[42%] rounded-full" style={{ background: "var(--purp)" }} />
            <div className="absolute -top-[7px] h-[19px] w-[19px] rounded-full" style={{ left: "42%", marginLeft: "-9px", background: "var(--ink)", boxShadow: "0 2px 10px var(--shadow2)" }} />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px]" style={{ color: "var(--ink6)" }}>
            <span>25</span><span>1,000</span>
          </div>
        </div>

        <div className="rounded-[20px] border p-[18px]" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
          <div className="text-[14.5px] font-medium">Default copy ratio</div>
          <div className="mt-3.5 grid grid-cols-4 gap-2 font-mono text-[12.5px]">
            {RATIOS.map((r) => {
              const active = r === ratio;
              return (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className="flex h-[42px] items-center justify-center rounded-xl"
                  style={active ? { background: "var(--purp)", color: "var(--inv)", fontWeight: 700 } : { border: "1px solid var(--a14)", color: "var(--ink3)" }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[20px] border p-[18px]" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14.5px] font-medium">Auto-cancel on source cancel</div>
              <div className="mt-1 font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>MIRRORS THE SHADOW EXACTLY</div>
            </div>
            <button onClick={() => setAutoCancel((v) => !v)}><Toggle on={autoCancel} /></button>
          </div>
          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--a08)" }}>
            <div>
              <div className="text-[14.5px] font-medium">Price-drift guard</div>
              <div className="mt-1 font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>CANCEL IF MID MOVES &gt; 0.8%</div>
            </div>
            <button onClick={() => setDriftGuard((v) => !v)}><Toggle on={driftGuard} /></button>
          </div>
          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--a08)" }}>
            <div>
              <div className="text-[14.5px] font-medium">Rate limit</div>
              <div className="mt-1 font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>MAX 6 COPIES PER MINUTE</div>
            </div>
            <button onClick={() => setRateLimit((v) => !v)}><Toggle on={rateLimit} /></button>
          </div>
        </div>

        <div className="rounded-[20px] border p-[18px]" style={{ borderColor: "rgba(160,5,93,.4)", background: "rgba(160,5,93,.1)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[14.5px] font-medium" style={{ color: "var(--berryInk2)" }}>Paper mode</span>
            <button onClick={() => setPaperMode((v) => !v)}><Toggle on={paperMode} /></button>
          </div>
          <div className="mt-2 font-mono text-[10.5px] leading-relaxed" style={{ color: "var(--berryInk3)" }}>
            SIMULATE COPIES AGAINST REAL LIVE KURU DATA. NOTHING IS SIGNED.
          </div>
        </div>
      </div>
    </main>
  );
}
