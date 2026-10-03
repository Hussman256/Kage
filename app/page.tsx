// usekage.xyz: the landing + APK download page. Kage itself is the Android
// app in mobile/; this site hosts the download and assetlinks.json (passkeys).

// Set once the first preview APK is built (EAS build artifact or a file we host).
const APK_URL = process.env.NEXT_PUBLIC_APK_URL;

const POINTS = [
  {
    title: "Copies trades, not bots",
    body: "On Kuru, nearly every resting order comes from a handful of market-making bots. Kage follows real traders' fills and leaves the bots out.",
  },
  {
    title: "Your price, never chased",
    body: "Copy places your own limit order at the trader's price, sized by your ratio and capped by your max order size. If the price moves, it waits or you cancel.",
  },
  {
    title: "Non-custodial",
    body: "Every order is signed with your own passkey wallet. Kage never holds or pools funds, and never signs in the background.",
  },
];

const STACK = [
  { name: "Kuru", note: "on-chain order book" },
  { name: "Envio", note: "trade indexer" },
  { name: "Privy", note: "passkey wallets" },
  { name: "Nansen", note: "smart-money labels (coming)" },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-inv">
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[640px] w-[640px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, var(--wash1), var(--invT) 66%)" }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-[520px] h-[460px] w-[460px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--berryWash1), var(--invT) 68%)" }}
      />

      <div className="relative mx-auto flex max-w-[640px] flex-col items-center px-4 pb-20 pt-20 text-center">
        <div
          className="font-jp text-[112px] font-black leading-none"
          style={{ color: "var(--ink)", textShadow: "11px 11px 0 #836EF9" }}
        >
          影
        </div>
        <h1 className="mt-10 text-[52px] font-semibold leading-none tracking-tight">Kage</h1>
        <p className="mt-4 font-mono text-[11.5px] tracking-[.22em]" style={{ color: "var(--purpInk)" }}>
          SHADOW THE SMART MONEY
        </p>
        <p className="mt-7 max-w-[460px] text-[17px] leading-relaxed" style={{ color: "var(--ink2)" }}>
          Follow the best traders on Kuru, see their trades as they happen, and copy one in a tap. Built on Monad.
        </p>

        {APK_URL ? (
          <a
            href={APK_URL}
            className="mt-9 rounded-2xl px-7 py-4 text-[16px] font-semibold text-white transition-colors"
            style={{ background: "var(--purp)" }}
          >
            Download for Android
          </a>
        ) : (
          <span
            className="mt-9 rounded-2xl px-7 py-4 text-[16px] font-semibold"
            style={{ background: "var(--a10)", color: "var(--ink4)" }}
          >
            Android build coming soon
          </span>
        )}
        <p className="mt-3 font-mono text-[10.5px] tracking-[.12em]" style={{ color: "var(--ink5)" }}>
          ANDROID APK · MONAD MAINNET · REAL FUNDS
        </p>

        <section className="mt-16 grid w-full gap-3 text-left">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--a09)" }}>
              <h2 className="text-[16px] font-semibold">{p.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink3)" }}>
                {p.body}
              </p>
            </div>
          ))}
        </section>

        {APK_URL && (
          <section className="mt-12 w-full text-left">
            <h2 className="font-mono text-[10.5px] tracking-[.16em]" style={{ color: "var(--ink5)" }}>
              INSTALLING THE APK
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed" style={{ color: "var(--ink3)" }}>
              <li>Open the download on your Android phone.</li>
              <li>If Android asks, allow your browser to install unknown apps.</li>
              <li>Open Kage and create a passkey. That passkey is your wallet: there is no seed phrase.</li>
            </ol>
          </section>
        )}

        <section className="mt-14 w-full">
          <h2 className="font-mono text-[10.5px] tracking-[.16em]" style={{ color: "var(--ink5)" }}>
            BUILT WITH
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STACK.map((s) => (
              <div key={s.name} className="rounded-xl border px-3 py-3" style={{ borderColor: "var(--a09)" }}>
                <div className="text-[15px] font-semibold">{s.name}</div>
                <div className="mt-1 text-[12px]" style={{ color: "var(--ink4)" }}>
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-14 max-w-[460px] text-[12px] leading-relaxed" style={{ color: "var(--ink5)" }}>
          Copy-trading moves real funds. Past trades don&apos;t predict future results, and leaderboard PnL is estimated from on-chain fills.
        </p>
      </div>
    </main>
  );
}
