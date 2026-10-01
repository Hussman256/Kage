"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLoginWithPasskey, useSignupWithPasskey, usePrivy } from "@privy-io/react-auth";

export default function OnboardPage() {
  const router = useRouter();
  const { ready } = usePrivy();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: () => router.replace("/smart"),
    onError: () => {
      // No passkey found for this device/account — fall back to creating one.
      setError(null);
      signupWithPasskey().catch((e) => {
        setBusy(false);
        setError(humanizeAuthError(e));
      });
    },
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: () => router.replace("/smart"),
    onError: (err) => {
      setBusy(false);
      setError(humanizeAuthError(err));
    },
  });

  function humanizeAuthError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel|abort/i.test(msg)) return "Passkey prompt was cancelled.";
    if (/not.?support/i.test(msg)) return "This browser doesn't support passkeys — try Chrome, Safari, or Edge.";
    return "Couldn't complete passkey sign-in. Try again.";
  }

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      await loginWithPasskey();
    } catch {
      // onError above handles the login->signup fallback path.
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-inv">
      <div
        className="pointer-events-none absolute -left-16 -top-32 h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(131,110,249,.30), var(--invT) 68%)" }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-9 text-center" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="font-jp text-[108px] font-bold leading-none animate-kage-drift" style={{ color: "var(--ink)", textShadow: "11px 11px 0 var(--markShadow)" }}>
          影
        </div>
        <div className="mt-8 text-[40px] font-semibold tracking-tight">Kage</div>
        <p className="mt-3.5 text-[15.5px] font-light leading-snug" style={{ color: "var(--ink3)" }}>
          Shadow the wallets Nansen already calls smart money.
        </p>
      </div>

      <div className="relative flex flex-col gap-3.5 px-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 42px)" }}>
        <div className="mb-2 flex flex-col gap-2.5">
          {[
            "Your keys, your wallet — always",
            "Every order signed by you, on Kuru",
            "Funds are never pooled",
          ].map((line) => (
            <div key={line} className="flex items-center gap-2.5 text-[13.5px]" style={{ color: "var(--ink2)" }}>
              <span className="h-1.5 w-1.5 flex-shrink-0 rotate-45" style={{ background: "var(--purp)" }} />
              {line}
            </div>
          ))}
        </div>

        {error && (
          <div
            className="rounded-2xl border px-4 py-3 text-[13px]"
            style={{ borderColor: "rgba(160,5,93,.4)", background: "rgba(160,5,93,.1)", color: "var(--berryInk2)" }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!ready || busy}
          className="flex h-[58px] items-center justify-center gap-2.5 rounded-2xl text-[16.5px] font-semibold tracking-tight text-inv transition-colors disabled:opacity-60"
          style={{ background: "var(--purp)", boxShadow: "0 14px 34px -12px rgba(131,110,249,.8)" }}
        >
          {busy ? "Waiting for passkey…" : "Continue with passkey"}
        </button>

        <div className="mt-1 text-center font-mono text-[10.5px] tracking-[.1em]" style={{ color: "var(--ink6)" }}>
          NO SEED PHRASE · NO CUSTODY · MONAD MAINNET
        </div>
      </div>
    </main>
  );
}
