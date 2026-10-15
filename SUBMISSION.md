# Kage: Metropolis submission draft

> Paste-ready text for the hackathon.monad.xyz project profile. Fill the `TODO` links before submitting.

**Project name:** Kage
**Track:** 1 — Onchain Finance & Trading
**Tagline:** Copy the shadow of the smartest money on Monad.
**Links:** Android APK: https://expo.dev/artifacts/eas/o0wwFUAiUj9nZKzpQzBJOobU4K-Hkf4E86msXd2gnzk.apk · Demo video: TODO · Code: https://github.com/Hussman256/Kage

---

## Short description (1–2 sentences)

Kage is an Android app that finds the real traders on Kuru, filters out the bots, ranks them by on-chain PnL and Nansen smart-money labels, and lets you copy their trades in one tap from your own passkey wallet. It is non-custodial throughout: every order is your own limit order, signed by you.

## Write-up

**Copy-trading is easy. Knowing who to copy is the product.**

Before we built anything, we measured Kuru on Monad mainnet. In one hour, 61,894 resting limit orders came from five wallets (four market-making bots), and one came from anyone else. Meanwhile about 90 real wallets made ~1,100 trades by taking liquidity. A copy-trading app that mirrors resting orders would just be copying bots.

So Kage is built around curation:

- **It copies trades, not orders.** The Feed shows the fills of traders you follow. Copy places *your own* limit order at the trader's price, never a market order that chases. A drift guard blocks the copy if the market has already moved past your threshold.
- **The bots are gone.** Market makers, wallets that trade through a market maker's contract, vanity `0x000…` arbitrage addresses and machine-speed takers are excluded from the leaderboard and the feed.
- **The ranking is honest.** Traders are ranked by estimated PnL across all four Kuru markets over 1H, 24H or 7D, with Nansen smart-money labels on the wallets Nansen knows. Without Nansen data the board says "Top PnL (beta)", never "smart money".
- **It's a phone app.** Passkey sign-in, no seed phrase, a one-tap copy sheet that pre-sizes from your risk settings and runs live pre-flight checks, a confirm time on every fill, and a Book screen for your open copies with cancel and withdraw.

Kage never holds funds and never signs in the background. Each copy is a transaction you approve with your passkey, and stale copies are flagged for a one-tap cancel rather than cancelled silently.

## How we used the sponsors

- **Kuru.** Reads and writes on mainnet across MON/USDC, cbBTC/USDC, WETH/USDC and XAUt0/USDC. Writes cover order planning (exact approve, deposit only the shortfall, tick-rounded limit price), a dry-run against the live contract before signing, receipt decoding into filled vs resting, `batchCancelOrders`, live order state, and `batchWithdrawMaxTokens`. We verified the event ABI against live logs where it differs from the docs.
- **Envio.** A HyperIndex project on Envio Cloud indexes every Kuru `Trade` into per-trade, per-hour and per-day trader aggregates, plus maker/taker counts. It powers the 24H/7D leaderboards, trader pages, bot detection and the Feed's history. The aggregation matches a per-fill replay of ~500 live trades to 1e-12.
- **Nansen.** A server route calls `smart-money/dex-trades` for Monad (cached to fit the free plan's credits) and the app tags matching Kuru traders with their Nansen label, with a smart-money-only filter.
- **Mera (Category Labs).** Native passkey onboarding and account derivation via the WebAuthn PRF extension (`@category-labs/mera`). Every copy is signed by the user's own passkey-derived wallet via Viem. Truly self-custodial, no seed phrases, no third-party custody.

## What was built during Metropolis

Everything in the repo was built during the build window, starting from Monad's Next.js starter (first commit 2026-09-22): the Android app, the Envio indexer, the Kuru read/write path, the bot analysis, and the usekage.xyz site. Full history: https://github.com/Hussman256/Kage/commits

## Known limitations

PnL is estimated from fills within the window. Bot filtering is heuristic. Indexer history is limited by the Envio free plan's event cap, and the app shows the true data start. Rooms supports creating/joining rooms with codes, maintaining a shared watchlist, and sharing setups directly into the room. Android only.

## AI disclosure

Kage was built with AI coding assistance (Claude Code). The product direction, mainnet measurements and testing were done and reviewed by the author.
