# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Start with `MEMORY.md`.** It holds the project's decisions (several override `prompt.md`), current status, next steps, what's blocked on the user, and known traps. Update its Status, Next steps and Checkpoint log sections at every checkpoint.

## What this is

Kage (影) is a mobile app (Expo, in `mobile/`) with a companion Next.js 14 web app at the repo root, for non-custodial copy-trading on Kuru (Monad), with traders ranked by Nansen smart-money labels. **Core mechanic (changed from `prompt.md`):** Kage copies traders' *trades*, not their resting limit orders. On Kuru, resting orders come almost entirely from ~4 market-making bots (61,894 orders from 5 wallets in a sampled hour, and 1 from anyone else), while real traders take liquidity. The Feed shows followed traders' fills, and Copy places the user's own limit order at the trader's price (it never chases the price). Built for the Monad Metropolis hackathon (deadline Oct 13 2026). `prompt.md` is the full product/build brief — read it before starting feature work; it defines the P0/P1/P2 priority order, the Nansen fallback rules, and non-functional requirements.

## Commands

```bash
npm install
cp .env.local.example .env.local   # then fill NEXT_PUBLIC_PRIVY_APP_ID
npm run dev                         # http://localhost:3000
npm run lint                        # next lint (next/core-web-vitals + next/typescript)
npm run build && npm run start      # needed to test PWA behavior (service worker, install prompt, offline)
```

There is no test suite yet.

## Mobile app (`mobile/`) — the primary product

Kage ships as a downloadable Android app (APK first, iOS later), built with Expo SDK 57 / React Native 0.86 in `mobile/`. Read `mobile/AGENTS.md` first: Expo changes every SDK, so check the versioned docs instead of relying on memory, and install packages with `npx expo install`.

```bash
cd mobile
npx expo start        # dev server; scan the QR with Expo Go on Android
npx tsc --noEmit      # typecheck
npx expo lint         # lint (Expo's own flat config; the root .eslintrc ignores mobile/)
npx expo-doctor       # dependency/config health
```

- Routes live in `mobile/src/app/` (Expo Router) and follow the design's flow: `index.tsx` (00 splash) → `onboard.tsx` (01 passkey) → `(tabs)/smart` (02). Also `(tabs)/` feed/book/rooms, `trader/[handle]` (03), and `risk.tsx` (08, opened from Book's ⚙). The copy sheet (05) and fill screen (06) are modals in `components/`. `@/` maps to `mobile/src/`.
- Theme and Risk settings are persisted with Async Storage in `mobile/src/theme/theme.tsx` (`useSettings`). The DARK/LIGHT toggle lives on the Risk screen, and the copy sheet reads max size, ratio and guards from these settings.
- Smart money and trader detail are live: `lib/kuru/leaderboard.ts` ranks Kuru takers by estimated PnL over 1H/24H/7D from the Envio indexer when `EXPO_PUBLIC_INDEXER_URL` is set (`lib/kuru/indexer.ts`), otherwise the last hour over RPC (~12,000 blocks at ~300 ms). It excludes market-making bots: over RPC, any address that provided resting liquidity in the window; with the indexer, addresses with 50+ lifetime maker fills or whose trades mostly go through a market maker's contract. The Trade event's `isBuy` is the taker's side. This is the plan's labelled "Top PnL (beta)" fallback until Nansen is wired.
- Book shows the user's real copies (`lib/copies.tsx` ledger + live order state). Only Rooms is still static sample UI, behind a visible `DataBadge`. Kage never signs in the background, so the expiry and drift guards flag copies for a one-tap cancel rather than cancelling them.
- In development, Expo Router bundles each screen separately, so the entry bundle doesn't prove every screen compiles. Use `npx expo export --platform android` for a full compile check.
- Theme tokens are in `mobile/src/theme/tokens.ts`, ported 1:1 from the design and matching `app/globals.css`.
- The 影 mark uses `assets/fonts/KageMark-*.ttf`: Noto Serif JP cut down to that single glyph (2 KB instead of 7.6 MB). SDK 57 has no variable-font support on phones, so the other fonts are static `@expo-google-fonts` Geist faces.
- `mobile/src/lib/` is a copy of the root `lib/` logic (Kuru, copy sizing, formatting); mobile is now the source of truth. It uses viem 2.57's built-in `monad` chain.
- Privy passkeys (`@privy-io/expo`) need a development build (not Expo Go), plus a Digital Asset Links file on a domain we own. The Next.js web app is meant to host that file and the APK download page.

## Web app architecture (Next.js, repo root)

- **`/` is the usekage.xyz landing + APK download page** (server component; download button reads `NEXT_PUBLIC_APK_URL`), and `public/.well-known/assetlinks.json` serves Android passkeys (fill in the EAS signing SHA-256). The older screens are `"use client"` pages under `app/` (`/onboard` → `/smart` leaderboard, `/trader/[handle]`, `/feed`, `/book`, `/risk`, `/rooms`, `/~offline`). No backend or DB yet. `/feed` reads live Kuru data; the other screens still use `lib/mock-data.ts`.
- **Monad mainnet (chain 143), not testnet.** Kuru's testnet market is inactive and Nansen labels only exist for mainnet wallets. `lib/monad.ts` defines the chain (viem 2.31 has no mainnet definition) and the shared public client. Public RPCs cap `eth_getLogs` at 100 blocks.
- **Kuru read path** (`lib/kuru/`): `markets.ts` has verified addresses (the Kuru SDK quickstart's addresses are stale; use the Contract-addresses page). `orderbook.ts` holds the ABI and decoding; the event signatures there were checked against live logs and differ from Kuru's OrderBook doc (no indexed params, `Trade.price` is uint256 1e18-scaled while `OrderCreated.price` uses the market's `pricePrecision`, cancels are `OrdersCanceled(uint40[],address)`). In the web app, `lib/kuru/live-orders.ts` tails resting orders (legacy). The mobile app's `mobile/src/lib/kuru/live-trades.ts` tails `Trade` events instead: it keys by tx origin, merges one tx's fills into a single trade at the volume-weighted average price, and excludes anyone seen as a maker. Both are polling RPC stopgaps until the Envio indexer exists. Followed wallets are persisted in `mobile/src/lib/follows.tsx`.
- **Copy sizing** lives in `lib/copy-sizing.ts`: source size × ratio, capped by the max order size, checked against the market minimum. Order submission isn't wired yet, so the fill screen says "not signed · paper copy".
- **Root layout sets `export const dynamic = "force-dynamic"`** and `app/components/client-privy-provider.tsx` loads `PrivyProvider` with `ssr: false`. Both exist because Privy throws during SSR/prerender without a real app ID — don't remove them. Privy also requires `NEXT_PUBLIC_PRIVY_APP_ID` to be exactly 25 characters or the whole app crashes (not just login).
- **Privy config** (`app/components/privy-provider.tsx`): passkey-only login, embedded wallet created on login, Monad mainnet. Never surface seed phrases. Copies move real funds, so never auto-sign.
- **PWA via Serwist**: `app/sw.ts` is compiled to `public/sw.js` by `next.config.mjs` (generated output is gitignored). `app/notification/route.ts` is the template's web-push test endpoint.
- **Two component dirs**: `app/components/` holds app-shell providers (Privy, theme, install prompt); `components/` holds screen UI (bottom nav, copy sheet, fill modal, icons, sample-data badge). Import via the `@/*` alias (repo root).
- **Theming**: design tokens are CSS custom properties in `app/globals.css`, defined under `[data-theme="dark"]` / `[data-theme="light"]`, and exposed as Tailwind colors in `tailwind.config.ts` (`canvas`, `inv`, `ink-2..6`, `purp`, `grn`, `berry`, …). Tailwind `darkMode` keys off the `data-theme` attribute, which `ThemeProvider` sets and persists to localStorage (`kage-theme`). Use tokens, not raw hex. Fonts: Geist (`font-sans`), Geist Mono (`font-mono`), Noto Serif JP (`font-jp`).

## Rules that matter for this project

- **Honest data labelling.** Any screen rendering mock data must show `<SampleDataBadge />`. When real integrations land, never present a plain PnL sort as "smart money" — if Nansen data isn't live, label the leaderboard "Top PnL (beta)" (see `prompt.md` §6).
- **Non-custodial only.** Every trade is signed by the user's own Privy wallet and submitted client-side via the Kuru SDK. If a design would require holding or pooling user funds, stop and flag it.
- **Don't guess SDK/API signatures** for Kuru (`@kuru-labs/kuru-sdk`), Envio HyperIndex, Nansen, or Privy — fetch the real docs.
- **Integration status**: Privy is wired; Kuru reads are live on `/feed` (no order submission yet); the Envio indexer is written (`indexer/`, see its README) but not deployed yet; Nansen is not started. `prompt.md`'s testnet references are superseded by mainnet. Their env vars are already stubbed in `.env.local.example` (`NANSEN_API_KEY` is server-only — never prefix with `NEXT_PUBLIC_`).
- Work in `prompt.md` §5 priority order: no P1/P2 work while any P0 item is still mocked. Prefer flagging blockers over adding more mock data.
- User-facing name is always "Kage".
