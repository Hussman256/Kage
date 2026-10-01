# MEMORY.md — Kage project memory & handoff

> **Read this first** when resuming work (any agent, any machine). It records what Kage is,
> every decision made and why, what's done, what's next, and the traps we already hit.
> `CLAUDE.md` covers code architecture and commands; `prompt.md` is the original brief —
> **where they disagree with this file, this file wins** (decisions below supersede the brief).
>
> **Keep it current:** update the Status, Checkpoint log, and Next steps sections at every
> checkpoint. Never put secrets here (API keys, private keys) — public IDs only.

_Last updated: 2026-09-30_

---

## 1. What Kage is

**Kage (影, "shadow")** — a downloadable **Android app** for non-custodial copy-trading on
**Kuru** (the on-chain order book DEX on **Monad**). Users discover the best traders, follow
them, see their trades live, and copy a trade in one tap. The pitch is **curation**:
traders ranked by **Nansen smart-money labels**, not raw self-reported PnL.
Tagline: *"Kage — copy the shadow of the smartest money on Monad."*

- **Hackathon:** Monad Metropolis, Track 1 (Onchain Finance & Trading). **Deadline: Oct 13, 2026.**
- **Sponsor bounties targeted:** Kuru, Nansen AI, Envio, Privy — each must be genuinely integrated and called out in the submission.
- **Non-custodial:** every order is signed by the user's own Privy embedded wallet. The app never holds or pools funds. If a design would require custody, stop and flag it.
- **Owner:** GitHub `Hussman256/Kage` (remote `origin`).

---

## 2. Decisions (these override `prompt.md`)

| # | Decision | Why | Date |
|---|---|---|---|
| D1 | **Monad mainnet (chain 143)**, not testnet, for reads *and* real-money copies | Kuru's testnet market had **0 events in ~10 days**; mainnet has ~20k events / 5 min. Nansen labels only exist for mainnet wallets. | 09-28 |
| D2 | **Native mobile app with Expo** (`mobile/`), not a PWA | User: the hackathon's point is an app people download on their phones. | 09-29 |
| D3 | **Android first**, distributed as an **APK via download link** (no store). iOS only if time allows ($99 Apple account). User tests on an Android phone. | Fastest, no review, no fees. | 09-29 |
| D4 | **Copy trades, not resting limit orders.** Feed shows followed traders' *fills*; Copy places the user's **own limit order at the trader's price** (never chases with a market order). | Measured on mainnet: **61,894 limit orders from 5 wallets (4 market-maker bots) vs 1 from anyone else** in an hour, while ~90 real wallets made ~1,100 taker trades. Copying resting orders = copying bots. | 09-30 |
| D5 | **Domain `usekage.xyz`** (user buying it). Android app ID **`xyz.usekage.app`**. Passkey relying party **`https://usekage.xyz`**. | Passkeys are permanently bound to a domain — never use a temporary domain (e.g. `*.vercel.app`) or every passkey breaks on switch. Until the domain is live the app stays in labelled preview mode. | 09-30 |
| D6 | **"Top PnL (beta)"** leaderboard until a Nansen key exists — real on-chain PnL, **always labelled**, never presented as Nansen smart money. | Build-plan rule: never fake the smart-money framing. | 09-30 |
| D7 | Theme **follows the phone** by default (System · Dark · Light in Settings). One gear icon top-right on every tab opens Settings; Risk controls live inside Settings. | User feedback: normal-app behaviour; the old toggle was buried and took two taps. | 09-29 |
| D8 | The **Next.js web app** (repo root) becomes the **usekage.xyz website**: hosts `/.well-known/assetlinks.json` (passkeys) and the APK download page. It is not a second phone app. | Keeps the web code useful; passkeys need a site we control. | 09-29 |

---

## 3. Status (checkpoint snapshot)

### ✅ Done
- **All 10 design screens ported to the Expo app**, following the design's flow: splash → passkey entry → Smart money; plus Feed, copy sheet, fill screen, Book, Risk, Rooms, trader detail, and a Settings screen.
- **Design fidelity:** colour tokens identical to the Claude Design spec (dark + light); Geist / Geist Mono fonts; 影 mark from Noto Serif JP subset to one glyph (2 KB instead of 7.6 MB).
- **Settings:** System/Dark/Light appearance and Risk controls (max order size slider, default ratio, drift guard, rate limit, expire-unfilled-copies, paper mode), all **persisted** on the phone (Async Storage).
- **Live Kuru reads (mainnet):** real trade feed (`live-trades.ts`), market params, best bid/ask.
- **Real Smart money leaderboard** ("Top PnL (beta)", last ~1 hour, ~7 s to compute over RPC) and **real trader pages** (PnL curve, net long/short, recent fills).
- **Feed switched to copying trades (D4)** with Following / All traders; **Follow** is persisted.
- **Copy sizing:** source size × ratio, capped by max order size, checked against Kuru's minimum (200 MON).
- **Passkey login code written** (Privy Expo SDK): login-or-signup flow, session restore on splash, wallet address + Log out in Settings, real address on the copy sheet. **Inactive until setup (see §5).** Expo Go runs a labelled preview mode because Privy's native passkey module can't load there.
- Checks passing at last checkpoint: `tsc`, `expo lint`, `expo-doctor` (21/21), full `expo export --platform android`.

### 🔄 In progress
- **Bot filter v2** — exclude vanity-address arbitrage bots (addresses starting `0x0000…`) and extreme-frequency takers from the leaderboard and feed. They currently slip past the maker-based filter (seen at #1 and #3 on the board).
- **Order placement** — Kuru margin-account deposit, place/cancel limit orders, guards (max size, rate limit, drift guard, expiry), dry-run testable; final signature waits on passkey login.

### ⏳ Not started / later
- **Envio indexer** (P0 in brief) — needed for 24H/7D leaderboards, history, real Book data at scale.
- **Nansen integration** — needs an API key (ask hackathon sponsor desk / Discord). Swaps "Top PnL (beta)" for Nansen labels on the same screens.
- **Book screen on real data** (still sample, labelled).
- **Rooms** (P1, sample, labelled).
- **App icon + splash image** (still Expo defaults).
- **Deploy the web app to usekage.xyz** with `assetlinks.json` + APK download page.
- **Preview APK build** for distribution; demo video; submission write-up (must credit Kuru, Nansen, Envio, Privy; check AI-assisted-coding disclosure rule).

---

## 4. Next steps (in order)

1. Bot filter v2 (in progress).
2. Order placement code (deposit → limit order → cancel; guards; dry-run).
3. When the user delivers the §5 items: `eas init`, first **development build** on EAS → get the signing SHA-256 → write `public/.well-known/assetlinks.json` in the web app → deploy to usekage.xyz → add the SHA-256 to Privy → set `mobile/.env.local` → test real passkey login + a real small trade.
4. Book on real data; Envio indexer; Nansen (when key arrives).
5. App icon/splash, preview APK, website download page, demo, submission.

---

## 5. Waiting on the user (blockers for passkey login & real trades)

- [ ] **Buy `usekage.xyz`** (any registrar). Later: add DNS records for Vercel (values to be provided).
- [ ] **Expo account** at expo.dev, then log in: `cd /c/Users/pc/Kage/mobile && npx eas-cli@latest login`.
- [ ] **Privy dashboard:** enable **Passkey** login; add an **app client** (mobile/React Native) with allowed app identifier **`xyz.usekage.app`**; send the **App ID** and **Client ID** (public IDs). After the first build: add the Android **SHA-256** key hash under allowed Android key hashes.
- [ ] **Vercel account** (free) for the website.
- [ ] **Nansen API key** — ask the hackathon sponsor desk / Discord.

---

## 6. How to run (Windows, Git Bash)

```bash
# Mobile app (the product)
cd /c/Users/pc/Kage/mobile        # Git Bash: forward slashes! (backslashes get eaten)
npx expo start                    # if it says "Using development build", press  s  to switch to Expo Go
# Phone: Expo Go → Scan QR code (phone and PC on the same network).
# Can't connect?  npx expo start --go --tunnel
npx tsc --noEmit && npx expo lint && npx expo-doctor
npx expo export --platform android --output-dir <tmp>   # full compile check (dev bundles are lazy per-screen)

# Web app (future usekage.xyz site)
cd /c/Users/pc/Kage && npm run dev
```

- The PC is low on memory; background dev servers have been killed by the OS. Prefer running `npx expo start` in your own terminal window.
- Env: copy `mobile/.env.example` → `mobile/.env.local` (gitignored). `EXPO_PUBLIC_*` values are bundled into the app — public IDs only.

---

## 7. Hard-won facts & traps (don't re-learn these)

**Kuru / Monad (verified on-chain, docs are wrong in places)**
- Use addresses from docs.kuru.io → *Contract Addresses*. The SDK quickstart's addresses have **no code on-chain** — ignore them.
- Mainnet MON/USDC market: `0x065C9d28E428A0db40191a54d33d5b7c71a9C394`. Margin account `0x2A68ba1833cDf93fa9Da1EEbd7F46242aD8E90c5`. Router `0xd651346d7c789536ebf06dc72aE3C8502cd695CC`. Mainnet RPC `https://rpc.monad.xyz`.
- Events have **no indexed params**. `Trade(uint40,address,bool,uint256,uint96,address,address,uint96)` — **price is 1e18-scaled uint256**; `OrderCreated.price` uses the market's `pricePrecision` (1e8 on MON/USDC); sizes use `sizePrecision` (1e10). Cancels emit `OrdersCanceled(uint40[],address)`.
- `Trade.isBuy` is the **taker's** side (Kuru SDK: isBuy=true consumes asks).
- Min order 200 MON. Public RPCs cap `eth_getLogs` at **100 blocks**. Monad blocks ≈ 400 ms.
- An empty book side can return **0 or uint256 max** from `bestBidAsk()`.
- Bot detection: anyone who appears as a `Trade` maker is a market-making bot; also skip trades whose taker is one of those contracts (operators rebalancing).

**Privy + Expo (SDK 57)**
- `@privy-io/expo@0.75.0` peer-requires **viem exactly 2.56.0** — viem is pinned (`--save-exact`). Don't let installs bump it.
- `mobile/.npmrc` has `legacy-peer-deps=true` (Privy's unused optional peer `permissionless` wants an old `ox`). EAS Build honours it.
- Always install with `npx expo install` (plain npm pulled an incompatible `react-native-get-random-values`).
- Polyfills load first via `mobile/entrypoint.js` (package.json `main`). `metro.config.js` carries Privy's package-exports workarounds.
- Privy must **never load in Expo Go** — `src/lib/privy.tsx` is only `require()`d when `authEnabled` (`src/lib/auth.tsx`).
- Passkey errors on Android: `NoCredentials` / `UserCancelled` / `Interrupted` / `NotSupported`. Sign-up fallback happens **only** on `NoCredentials` (so failures don't create duplicate accounts).
- Android passkeys need `https://usekage.xyz/.well-known/assetlinks.json` (package `xyz.usekage.app` + EAS signing SHA-256) and the same SHA-256 in Privy.

**Expo**
- `AGENTS.md` in `mobile/`: Expo changes every SDK — check the versioned docs, don't trust memory.
- SDK 57 has **no variable-font support** on phones → static font files.
- React Compiler lint rules: no reading/writing refs during render, no synchronous `setState` in effects.
- `userInterfaceStyle` must be `automatic` for the System theme to work (needs a dev-server restart after changing `app.json`).

**Windows / environment**
- Git Bash eats backslashes: use `/c/Users/pc/Kage/mobile`. If `npx` offers to install `expo`, you're in the wrong folder — say **no**.
- Stopping a background `expo start` can leave Metro holding port 8081; kill that node process before restarting.

---

## 8. Design reference

- Source of truth: Claude Design artifact **"Monad Trading App Design"** — https://claude.ai/artifact/5iKLgNfCjFoAQ1Mipn9v7T (a bundled page: unpack the `__bundler/manifest` + `__bundler/template` JSON to read the HTML).
- Intentional deviations: honest data badges on non-live screens; Settings screen + gear icons (D7); Feed copies trades (D4) so "Copy this order" → "Copy this trade", "auto-cancel if source cancels" → "expire unfilled copies"; onboarding footer says MAINNET.

---

## 9. Checkpoint log

| Date | Checkpoint |
|---|---|
| 09-28 | Initial commit `b634bcc`: Next.js PWA scaffold, 10 screens (sample data). |
| 09-28 | `CLAUDE.md` created. Design check vs artifact (5 mismatches found). Discovered testnet dead → **D1 mainnet**. Web app `/feed` reading live Kuru orders. |
| 09-29 | **D2/D3:** Expo app scaffolded in `mobile/`; all 10 screens ported; running on user's Android phone via Expo Go. Settings + appearance (**D7**). |
| 09-30 | Passkey login code (Privy) written, gated on setup. **D5** domain/app ID. Real Smart money leaderboard + trader pages. **D4** feed switched to copying trades; follows persisted. `MEMORY.md` created. |
| 09-30 | ⚠️ All work after `b634bcc` is **uncommitted** at time of writing — commit & push to `origin` to make it safe. |
