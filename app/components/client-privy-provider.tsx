"use client";

import dynamic from "next/dynamic";

// Privy's SDK touches browser-only APIs and throws during SSR when the app
// ID isn't a real, registered Privy app (true for every env until a real
// dashboard.privy.io app is wired in) — so it's loaded client-only rather
// than server-rendered.
const PrivyProvider = dynamic(() => import("./privy-provider"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-inv">
      <div className="font-jp text-5xl font-bold opacity-60" style={{ color: "var(--ink)" }}>
        影
      </div>
    </div>
  ),
});

export default function ClientPrivyProvider({ children }: { children: React.ReactNode }) {
  return <PrivyProvider>{children}</PrivyProvider>;
}
