"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      router.replace(authenticated ? "/smart" : "/onboard");
    }, 700);
    return () => clearTimeout(t);
  }, [ready, authenticated, router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-inv">
      <div
        className="pointer-events-none absolute left-1/2 top-[8%] h-[640px] w-[640px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, var(--wash1), var(--invT) 66%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--berryWash1), var(--invT) 68%)" }}
      />

      <div
        className="relative font-jp text-[132px] font-black leading-none"
        style={{ color: "var(--ink)", textShadow: "13px 13px 0 #836EF9" }}
      >
        影
      </div>
      <div className="relative mt-11 text-[52px] font-semibold tracking-tight">Kage</div>
      <div className="relative mt-3.5 font-mono text-[11.5px] tracking-[.22em]" style={{ color: "var(--purpInk)" }}>
        SHADOW THE SMART MONEY
      </div>

      <div className="absolute bottom-28 left-1/2 h-[3px] w-[116px] -translate-x-1/2 overflow-hidden rounded-full" style={{ background: "var(--a12)" }}>
        <div className="h-[3px] w-2/3 rounded-full" style={{ background: "var(--purp)" }} />
      </div>
      <div
        className="absolute bottom-14 left-0 right-0 text-center font-mono text-[10.5px] tracking-[.2em]"
        style={{ color: "var(--ink3)" }}
      >
        BUILT ON MONAD
      </div>
    </main>
  );
}
