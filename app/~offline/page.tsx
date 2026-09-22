import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-inv px-8 text-center">
      <div className="font-jp text-6xl font-bold" style={{ color: "var(--ink)" }}>影</div>
      <h1 className="m-0 text-xl font-semibold">You&apos;re offline</h1>
      <p className="m-0 text-sm" style={{ color: "var(--ink4)" }}>
        Kage needs a connection to Monad to show live data. Reconnect and reopen the app.
      </p>
    </main>
  );
}
