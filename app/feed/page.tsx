"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SampleDataBadge } from "@/components/sample-data-badge";
import { CopySheet, type CopySource } from "@/components/copy-sheet";
import { FillModal } from "@/components/fill-modal";
import type { CopySize } from "@/lib/copy-sizing";
import { fmtAge, fmtAmount, fmtPrice, shortAddr } from "@/lib/format";
import type { LiveOrder } from "@/lib/kuru/live-orders";
import { MARKETS } from "@/lib/kuru/markets";
import { useLiveOrders } from "@/lib/kuru/use-live-orders";

const MAX_ROWS = 25;
// Until Nansen scoring is wired, nobody in the feed has earned a smart-money label.
const LABEL = "UNLABELED";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function toCopySource(o: LiveOrder, now: number): CopySource {
  return {
    who: shortAddr(o.owner),
    label: LABEL,
    isBuy: o.isBuy,
    pair: o.pair,
    base: o.base,
    size: o.remaining,
    price: o.price,
    age: fmtAge(now - o.placedAt),
    minSize: o.minSize,
  };
}

export default function FeedPage() {
  const { orders, headBlock, status, error } = useLiveOrders();
  const now = useNow();
  const [copying, setCopying] = useState<CopySource | null>(null);
  const [ready, setReady] = useState<{ order: CopySource; copy: CopySize } | null>(null);

  const resting = orders.filter((o) => o.status === "open" || o.status === "partial").slice(0, MAX_ROWS);
  const makers = new Set(orders.map((o) => o.owner)).size;

  return (
    <main className="min-h-dvh bg-inv pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-[30px] font-semibold tracking-tight">Feed</h1>
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px]"
            style={
              status === "error"
                ? { color: "var(--berryInk)", borderColor: "rgba(240,140,190,.4)" }
                : { color: "var(--grn)", borderColor: "var(--g30)" }
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "animate-kage-pulse" : ""}`}
              style={{ background: status === "error" ? "var(--berryInk)" : "var(--grn)" }}
            />
            {headBlock ? `BLOCK ${headBlock.toLocaleString("en-US")}` : status === "error" ? "OFFLINE" : "CONNECTING"}
          </div>
        </div>
        <div className="mt-2.5 font-mono text-[11.5px]" style={{ color: "var(--ink5)" }}>
          {makers} makers seen · {MARKETS.map((m) => m.pair).join(" · ")}
        </div>
      </div>

      <SampleDataBadge label="LIVE KURU MAINNET · NOT YET FILTERED BY NANSEN" />

      {status === "error" && (
        <div className="mx-5 mb-3 font-mono text-[11px]" style={{ color: "var(--berryInk)" }}>
          Can&apos;t reach Monad RPC — retrying. {error?.slice(0, 80)}
        </div>
      )}

      <div className="flex flex-col gap-3 px-5">
        {resting.length === 0 && status !== "error" && (
          <div className="py-10 text-center font-mono text-[11.5px]" style={{ color: "var(--ink5)" }}>
            {status === "live" ? "No resting orders right now." : "Reading Kuru order book…"}
          </div>
        )}
        {resting.map((o) => (
          <div key={o.key} className="rounded-[20px] border p-4" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-[26px] w-[26px] rounded-lg" style={{ background: "linear-gradient(140deg, var(--purp), #A0055D)" }} />
                <span className="font-mono text-[13px] font-semibold">{shortAddr(o.owner)}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px]" style={{ background: "var(--a10)", color: "var(--ink4)" }}>{LABEL}</span>
              </div>
              <span className="font-mono text-[10.5px]" style={{ color: "var(--ink6)" }}>
                {o.status === "partial" ? "PARTIAL · " : ""}
                {fmtAge(now - o.placedAt)}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="rounded px-2 py-1 font-mono text-[11px] font-semibold"
                    style={o.isBuy ? { background: "var(--g16)", color: "var(--grn)" } : { background: "rgba(160,5,93,.18)", color: "var(--berryInk)" }}
                  >
                    {o.isBuy ? "BUY LIMIT" : "SELL LIMIT"}
                  </span>
                  <span className="text-[17px] font-semibold tracking-tight">{o.pair}</span>
                </div>
                <div className="tabular-nums mt-2.5 font-mono text-[12.5px]" style={{ color: "var(--ink3)" }}>
                  {fmtAmount(o.remaining)} {o.base} @ {fmtPrice(o.price)}
                </div>
              </div>
              <button
                onClick={() => setCopying(toCopySource(o, now))}
                className="h-10 rounded-xl px-5 text-[14.5px] font-semibold text-inv"
                style={{ background: "var(--purp)" }}
              >
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>

      {copying && (
        <CopySheet
          order={copying}
          onClose={() => setCopying(null)}
          onConfirm={(copy) => {
            setReady({ order: copying, copy });
            setCopying(null);
          }}
        />
      )}
      {ready && <FillModal order={ready.order} copy={ready.copy} onClose={() => setReady(null)} />}

      <BottomNav />
    </main>
  );
}
