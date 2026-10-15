# Kage 影

**Copy the shadow of the smartest money on Monad.**

Kage is an Android app for non-custodial copy-trading on [Kuru](https://kuru.io), the on-chain order book on Monad. It finds the real traders on Kuru, ranks them, lets you follow them, shows their trades as they happen, and copies a trade in one tap. Every order is signed by your own passkey wallet. Kage never holds or pools funds.

Built for **Monad Metropolis**, Track 1 (Onchain Finance & Trading). Sponsor integrations: **Kuru**, **Envio**, **Nansen**, **Privy**.

## The idea: curation, not a copy button

Mirroring a wallet is easy. The hard part is knowing *who* is worth copying, and on Kuru most of the activity isn't people at all.

We measured mainnet before building. In one sampled hour, **61,894 resting limit orders came from 5 wallets** (4 market-making bots), and **1 came from anyone else**. Meanwhile about 90 real wallets made ~1,100 trades by *taking* liquidity. An app that copies resting orders would mostly be copying bots.

So Kage copies **trades**:

- The **Feed** shows the fills of traders you follow.
- **Copy** places *your own limit order at the trader's price*. It never chases the price with a market order. If the market has moved past your drift guard, the copy is blocked.
- **Bots are filtered out everywhere**: anyone seen providing resting liquidity (market makers), wallets that trade through a market maker's contract, vanity `0x000…` addresses (arbitrage bots grind these for cheaper calldata), and machine-speed takers (100+ fills an hour).
- The leaderboard ranks what's left by estimated PnL across all four Kuru markets. It is labelled **"Top PnL (beta)"** until Nansen smart-money labels are live. A plain PnL sort is never presented as "smart money".

## Screens

Splash → passkey onboarding → **Smart money** (1H / 24H / 7D leaderboard, Nansen filter) → **trader page** (PnL curve, per-market breakdown, net long/short, recent fills) → **Feed** (Following / All) → **copy sheet** (size from your ratio, capped by your max, live pre-flight checks) → **result** (filled now vs resting, tx link, confirm time) → **Book** (your copies, live fill progress, cancel / cancel all, stale flags) → **Settings** (appearance, risk controls, wallet, Kuru balances and withdraw) → **Rooms** (Dojo rooms, shared watchlist, shared setups feed).

## Architecture

```
 Phone (Expo / React Native)                       Monad mainnet (chain 143)
 ┌───────────────────────────────┐   eth_call / logs   ┌──────────────────────┐
 │ Feed (live tail)  Copy sheet  │◄───────────────────►│ Kuru order books (4) │
 │ Book  Leaderboard  Trader     │   signed txs        │ Kuru margin account  │
 │ Privy embedded wallet (passkey)│───────────────────►└──────────┬───────────┘
 └──────┬──────────────┬─────────┘                                │ Trade events
        │ GraphQL      │ HTTPS                                    ▼
        ▼              ▼                                 ┌──────────────────────┐
 ┌─────────────┐  ┌──────────────────────┐               │ Envio HyperIndex     │
 │ Envio Cloud │◄─┤ usekage.xyz (Next.js)│               │ (indexer/)           │
 │ Hasura API  │  │ /api/smart-money ────┼──► Nansen API └──────────────────────┘
 └─────────────┘  │ assetlinks.json, APK │
                  └──────────────────────┘
```

- **`mobile/`, the product.** Expo SDK 57, React Native 0.86, Expo Router, viem. All trading logic lives in `mobile/src/lib/kuru/`.
- **`indexer/`.** An Envio HyperIndex project over Kuru's `Trade` event on all four markets: taker trades, per-trader hourly/daily buckets, hourly market prices, and the maker/taker counts used for bot detection.
- **Repo root.** A Next.js 14 site for usekage.xyz: the landing and APK download page, `/.well-known/assetlinks.json` for Android passkeys, and the server-only Nansen route.
- **No custody, and no backend that touches funds.** The only server code is the Nansen proxy, which exists to keep the API key off phones.

## Sponsor integrations

### Kuru: reads and writes, mainnet
- **Reads:** market params, best bid/ask, live `Trade` events across MON/USDC, cbBTC/USDC, WETH/USDC and XAUt0/USDC (`orderbook.ts`, `live-trades.ts`). The ABI was checked against live logs, because the published docs differ: events have no indexed params, `Trade.price` is 1e18-scaled, and `OrderCreated.price` uses the market's `pricePrecision`.
- **Writes** (`trading.ts`, `execute.ts`): exact-amount USDC approve, a margin-account deposit of only the shortfall, then a limit order with the price rounded to the tick in the user's favour. Before signing, the live contract dry-runs the order with the margin balance state-overridden (`dry-run.ts`). After signing, receipt logs are decoded into "filled now" (`Trade`) vs "resting" (`OrderCreated`).
- **Order management:** `batchCancelOrders` for cancel and cancel-all, live `s_orders` state for fill progress, and `batchWithdrawMaxTokens` to move funds back to the wallet.

### Envio: HyperIndex on Envio Cloud
- `indexer/` indexes every Kuru `Trade` into `TakerTrade`, `TraderHour`, `TraderDay`, `MarketHour` and `Trader`. It merges a market order's fills into one trade at the volume-weighted average price. The aggregation (`indexer/src/aggregate.ts`) was replayed against ~500 live trades and matches the per-fill PnL method to 1e-12.
- The app uses it for the 24H and 7D leaderboards (which direct RPC can't afford: public RPCs cap `eth_getLogs` at 100 blocks), trader pages, bot detection from lifetime maker counts, and the Feed's history (followed wallets' latest trades, plus the last stretch market-wide with bots excluded in the query). RPC tails new blocks on top.

### Nansen: smart-money labels
- `app/api/smart-money/route.ts` calls Nansen's `smart-money/dex-trades` for Monad and caches it for 12 hours, which fits the free plan's 10 credits a day. The app tags matching Kuru traders with their Nansen label (Smart Trader, Fund, 90D Smart Trader…) and adds a NANSEN SMART MONEY filter.
- It never throws. Without a key, the board stays honestly labelled "Top PnL (beta)".

### Privy: passkey wallets
- `@privy-io/expo` passkey login and sign-up, with an embedded wallet created on login. No seed phrase is ever shown. Sign-up only falls back on `NoCredentials`, so a cancelled prompt never creates a duplicate account.
- Every copy is a transaction the user approves with their passkey. **Kage never signs in the background**, so the expiry and drift guards flag stale copies for a one-tap cancel instead of cancelling them silently.

## Risk controls

Max order size, default copy ratio (25 / 50 / 100 / 200 %), drift guard (blocks a copy, and flags a resting one, once price moves past your threshold), a 6-per-minute copy rate limit, expiry for unfilled copies, and paper mode. All are persisted on the phone. Insufficient balance, below-minimum size, rejected orders and unconfirmed transactions each get a specific message. A transaction that was sent but not yet confirmed is never reported as failed.

## Run it locally

```bash
# Mobile app
cd mobile
npm install
cp .env.example .env.local      # EXPO_PUBLIC_INDEXER_URL enables 24H/7D and feed history
npx expo start                   # scan the QR with Expo Go on Android

npx tsc --noEmit && npx expo lint && npx expo-doctor
npx expo export --platform android   # full compile check (dev bundles compile per screen)

# Website + Nansen route
cd ..
npm install
cp .env.local.example .env.local  # NANSEN_API_KEY (server-only)
npm run dev

# Indexer: see indexer/README.md (deploys to Envio Cloud)
```

Expo Go runs a labelled preview mode: Privy's native passkey module can't load there, so live signing needs a development build (`eas build --profile development`).

## Known limitations

- **Passkey login needs the usekage.xyz domain.** Android binds passkeys to a domain through `assetlinks.json`, so login (and therefore signed copies) only works in a build that has the domain live. Until then the app runs in paper mode, which uses all the same live data and sizing and says "NOT SIGNED · PAPER COPY".
- **PnL is estimated**, from taker fills within the window, marked to the current mid price. Positions opened before the window start at zero.
- **Bot filtering is heuristic.** It catches market makers, operator wallets, vanity addresses and machine-speed takers, but a slow, human-paced bot can still rank.
- **Indexer history is limited** by the Envio free plan's event cap. The leaderboard shows "SINCE hh:mm UTC" rather than claiming a full 7 days.
- **Rooms (Dojo)** supports creating/joining rooms via codes, managing a shared trader watchlist, and posting/copying setups directly into the room.
- No automated test suite. The checks are type-checking, lint, live dry-runs against the contract, and replaying the indexer aggregation against real logs.
- Android only. iOS would need an Apple developer account.

## AI-assisted development

Kage was built with AI coding assistance (Claude Code). Product decisions, on-chain measurements and testing were directed and reviewed by the author.
