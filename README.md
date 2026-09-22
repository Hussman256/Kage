# Kage 影

**Copy the shadow of the smartest money on Monad.**

Kage is a mobile-first PWA that ranks Monad's Kuru traders by Nansen
smart-money signal — not raw, self-reported PnL — and lets you copy their
resting limit orders in one tap. Non-custodial throughout: every wallet is
the user's own Privy embedded wallet, every order is signed and submitted by
the user, nothing pools funds.

Built for the Monad Metropolis hackathon (Track 1 — Onchain Finance &
Trading). Target sponsor integrations: **Kuru**, **Nansen AI**, **Envio**,
**Privy**.

## Why curation, not the copy-trading mechanism

Watch-a-wallet-and-mirror-its-orders is a known recipe now (Chainstack
publishes a working tutorial for it). Kage's actual bet is **who's worth
copying** — Nansen-scored smart money, honestly labelled, with a documented
non-custodial fallback ranking when Nansen coverage is thin — plus a mobile
product quality bar (one-tap copy, real risk controls, honest latency
reporting) that a backend recipe alone doesn't give you.

## Status

This is the foundation pass: the real Next.js + Privy + Serwist PWA
scaffold, fully rebranded, with all 10 screens from the product design
implemented and navigable. **Kuru, Envio, and Nansen are not wired in yet**
— every screen that shows trading data is clearly marked `SAMPLE DATA · NOT
LIVE` rather than dressed up as real.

| Integration | Status |
|---|---|
| **Privy** (passkey auth, embedded wallet) | Code wired (`useLoginWithPasskey` / `useSignupWithPasskey`), needs a real `NEXT_PUBLIC_PRIVY_APP_ID` to actually authenticate — see Setup below |
| **Kuru** (`@kuru-labs/kuru-sdk`) | Not started — next build step |
| **Envio** (HyperIndex, Monad Testnet) | Not started — next build step |
| **Nansen** (Smart Money API) | Not started — next build step; sample-data leaderboard stands in for it honestly, not silently |

Screens implemented (mock data, matching the product design 1:1): splash,
passkey onboarding, smart-money leaderboard, trader detail ("why this
wallet"), live feed, one-tap copy bottom sheet, fill/latency confirmation,
open orders & positions ("book"), risk controls, and rooms (P1, static).

## Architecture

- **Frontend**: Next.js 14 (App Router), Tailwind, PWA via Serwist. Mobile-first — desktop is untested/secondary.
- **Auth / wallet**: Privy embedded wallets, passkey-only (no seed phrase surfaced anywhere). See `app/components/privy-provider.tsx` and `app/onboard/page.tsx`.
- **Design tokens**: ported verbatim from the product's Claude Design spec into `app/globals.css` (CSS custom properties, dark/light theme) and `tailwind.config.ts`.
- **State today**: everything is client-side mock data from `lib/mock-data.ts`. No backend, no database yet — none is needed until Envio/Nansen reads and the copy-order write path exist.
- **Non-custodial by design**: the app will never hold funds or have withdrawal rights. Every future trade write goes straight from the client, through the Kuru SDK, to Monad, signed by the user's own embedded wallet.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_PRIVY_APP_ID from https://dashboard.privy.io
# (enable passkey login for the app, Platform = Web)
npm run dev
```

Open `http://localhost:3000` — it'll route you through the splash screen to
onboarding. Passkey login will fail until a real Privy App ID is set, but
the rest of the app works on sample data — **as long as the placeholder ID
is exactly 25 characters**, which is the one thing Privy's SDK validates
client-side before anything else can render (a shorter/longer placeholder
like `your_privy_app_id_here` crashes the whole app, not just login).

For full PWA behavior (install prompt, offline fallback):

```bash
npm run build && npm run start
```

## Known limitations (this pass)

- No live Kuru, Envio, or Nansen data — all trading screens are sample data, visibly labelled.
- Risk controls, follow/unfollow, and the copy sheet are UI-complete but not persisted or backend-wired.
- Rooms (P1) is static — no create/join flow yet.
- Not deployed to a live URL yet (required before hackathon submission).
- No automated tests yet.
- App icons (`public/icons/*`, favicons) are still the cloned starter's placeholder icons, not a Kage mark.

## Env vars

See `.env.local.example` for the full list, with notes on which build step
wires each one in.
