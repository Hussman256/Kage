# Build Brief: Kage — Kuru Social Copy-Trading App (Monad Metropolis)

Paste this whole document to a Claude agent (Claude Code / Cowork) as the first message of the build session. It has full context — the agent shouldn't need you to explain the project again.

---

## 1. What you're building

**Kage** (影, Japanese for "shadow") — a mobile-first PWA where users discover Monad's best Kuru traders — ranked by Nansen "smart money" signal, not raw self-reported PnL — follow them, and copy their resting limit orders with one tap. The name is the pitch: you shadow a trader's moves. Non-custodial throughout: every wallet is the user's own Privy embedded wallet, every order is signed and submitted by the user, nothing pools funds.

Use "Kage" as the actual product name everywhere it's user-facing: PWA manifest (`name` / `short_name`), page titles, README title, pitch deck, and the hackathon submission title. Don't call it "the copy-trading app" in anything the user or a judge sees.

**Core loop:** discover a smart-money trader on Kuru → follow them → see their new limit orders in a live feed → tap "Copy" → bottom sheet pre-fills size scaled to the user's risk % and shows price/side/pair → confirm → order goes to Kuru from the user's own wallet → fill shows up with a latency badge.

This is for the **Monad Metropolis hackathon**, Track 1 (Onchain Finance & Trading), build window Sept 1–Oct 13 2026, submission deadline Oct 13. Target sponsor bounties: **Kuru**, **Nansen AI**, **Envio**, **Privy**. Track prize is $30k; there's also a $25k cross-track Grand Champion.

## 2. Why the framing matters — read before writing code

Chainstack (a hackathon sponsor) has a public tutorial and repo for a generic "Kuru copy-trading bot": WebSocket order monitoring, ratio-based position sizing, auto-mirror, auto-cancel. That mechanism is not a differentiator anymore — assume several other teams will ship some version of it. Do not pitch or build this as "we invented copy trading on Kuru." The actual product bet is:

1. **Curation, not raw ranking.** The leaderboard is Nansen-scored smart money (`Smart Trader` / `30D`/`90D`/`180D Smart Trader` / `Fund` labels on Monad), not a leaderboard sorted by self-reported or naively-computed PnL. This is the single most important thing to get right — it's the whole reason to follow anyone in this app.
2. **Mobile product quality**, not backend cleverness. The bot logic is a known recipe now; the one-tap bottom sheet, the feed, the risk controls UX, and the fill-latency feedback are what have to feel considered.
3. **Speed is a detail, not the headline.** Fill-time badges and live order-book pulse are real and worth having (Monad's 300ms blocks / 600ms finality make them true), but don't center the pitch on "look how fast Monad is" — assume most trading projects in this hackathon will claim that.

Keep this framing in the pitch deck and README, not just in your head. It also gives you the tagline for free: **"Kage — copy the shadow of the smartest money on Monad."**

## 3. What already exists — don't rebuild it

There is an existing scaffold. Before writing anything new, read it and build on it rather than starting over:

- Next.js PWA cloned from the official Monad template `monad-developers/next-serwist-privy-embedded-wallet` (Serwist for PWA/offline, Privy for auth)
- A Kuru SDK wrapper (stubbed)
- A trade bottom sheet component (stubbed)
- Feed / leaderboard / copy UI (stubbed with sample data)
- An Envio indexer scaffold (not yet deployed)

The immediate blocker to unstub everything is: **a real Kuru market address on the target network, and a deployed Envio indexer**. Resolve that first — everything else is waiting on real data.

## 4. Tech stack (confirmed — use these, don't substitute without a reason)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind, PWA via Serwist | Mobile-first; treat desktop as secondary |
| Auth / wallet | Privy embedded wallets, passkey login | No seed phrases anywhere in the flow. Env vars: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_PRIVY_CLIENT_ID` |
| Orderbook | `@kuru-labs/kuru-sdk` (npm) | Read quickstart-sdk, orderbook-sdk, and deploy-market pages at docs.kuru.io before implementing — don't guess method signatures |
| Indexing | Envio HyperIndex, Monad Testnet chain support (envio.dev/chains/monad-testnet) | Index Kuru order-placed / order-filled / order-cancelled events per market; this feeds both the live feed and the PnL fallback calc |
| Smart-money data | Nansen Smart Money API (docs.nansen.ai/api/smart-money) — supports Monad as one of its chains | Query with `chains: ["monad"]`, filter `include_smart_money_labels`, sort by `value_usd`. This is a paid/keyed API — get a key from the sponsor desk or hackathon Discord; build a graceful fallback (see §6) in case a key isn't available in time |
| Network | Monad testnet (chain id `10143`) for development; confirm mainnet (`143`) readiness before demo day | |
| Optional speed layer | Monad Execution Events SDK (blog.monad.xyz/blog/execution-events-sdk) | Only if time allows in P2 — gives sub-block-latency fill events for the "filled in Xms" badge instead of estimating from RPC round-trip |

## 5. Feature spec

### P0 — must work end-to-end for the demo (target: done by end of week 2)

- [ ] Passkey login via Privy, embedded wallet created, no seed phrase shown anywhere
- [ ] Real Kuru market wired in (pick 1–2 liquid testnet markets to start, not the full market list)
- [ ] Envio indexer deployed and live, feeding order events into the app (replace all sample data)
- [ ] Leaderboard of Kuru-active wallets, ranked by Nansen smart-money score where available, with a clear fallback rank (see §6) where it isn't
- [ ] Follow / unfollow a trader
- [ ] Live feed of followed traders' new resting limit orders (pair, side, price, size, age)
- [ ] "Copy this order" bottom sheet: shows source order detail, pre-fills copy size from user's risk % setting, shows max size and estimated cost, single confirm action
- [ ] Order submission from the user's own Privy wallet via the Kuru SDK — non-custodial, no pooled funds anywhere
- [ ] Risk controls: user-set max order size, user-set copy ratio (e.g. 25/50/100/200%), auto-cancel the copied order if the source order is cancelled or if price has moved past a configurable threshold
- [ ] Fill / order-status feed with a latency badge ("filled in Xms")
- [ ] Basic open-orders / positions view

**Acceptance for P0:** a user with zero setup can log in with a passkey, follow a real Nansen-flagged smart-money wallet, see a real order that wallet placed on Kuru, copy it in one tap, and watch it fill on Monad testnet — live, not mocked.

### P1 — the actual differentiator (target: week 3)

- [ ] Nansen scoring fully replaces the fallback ranking as the primary leaderboard sort, with the label (`Smart Trader`, `90D Smart Trader`, `Fund`, etc.) shown next to each wallet
- [ ] A short "why this wallet" detail view: recent win rate / notable trades / label history
- [ ] Rooms: create or join a room (shareable link or code), shared watchlist of traders, one-tap "share this trade setup into the room," simple aggregate room PnL or a lightweight leaderboard within the room

### P2 — polish, only after P0 and P1 are solid (week 4)

- [ ] Guided "first trade" flow for a brand-new user (paper mode using real live Kuru data, then a small guided real trade)
- [ ] Live order-book pulse animation tied to real block/event cadence
- [ ] Side-by-side "this would take ~Ns on a slower chain" comparison framing, used sparingly (one screen, not the whole pitch)
- [ ] Push notifications (Serwist is already wired for this) when a followed trader places a new order

Do not start P1 or P2 work before every P0 checkbox is real and demoable on testnet. A working, narrow P0 beats a half-working full feature set — this is explicitly called out in both source playbooks for this hackathon (scope to ~40% of what you think you can build).

## 6. The Nansen fallback — plan for this now, not on demo day

If a Nansen API key isn't available in time, or the Monad coverage on Smart Money labels turns out to be thin for the specific markets you pick, have a documented fallback ranking computed from your own Envio-indexed data: realized PnL per wallet over a lookback window, computed from fills, with obvious data caveats disclosed in the UI (e.g., "estimated PnL, testnet data"). Never silently fake the "smart money" framing with a plain PnL sort — if Nansen data isn't live, label the leaderboard honestly as "Top PnL (beta)" until it is.

## 7. Non-functional requirements

- Deploy to a **live URL**, not just `localhost` — required for judging and for the demo itself
- Non-custodial: the app must never hold or have withdrawal rights over user funds; every transaction is signed by the user's own Privy wallet
- Handle Kuru order rejections, insufficient balance, and slippage/price-moved-since-copy gracefully with a real error message, not a silent failure
- Rate-limit copy execution so a burst of source-wallet activity can't spam a user's wallet with orders
- Check the hackathon's official rules page for any AI-assisted-coding disclosure requirement and comply with it in the submission if one exists — some Metropolis teams have included this disclosure, confirm whether it's mandatory
- Write a README covering: architecture, how to run locally, which sponsor tools are integrated and how, and known limitations
- Set the PWA manifest and page `<title>` to "Kage" (with a short tagline in the meta description), and update any leftover template branding from the cloned Monad starter

## 8. Timeline (today is Sept 15 — about 4 weeks to the Oct 13 deadline)

- **Week 1 (now):** unblock real data — real Kuru testnet market address, Envio indexer deployed and indexing it live. Nothing else matters until sample data is gone.
- **Week 2:** finish P0 end to end, test the full loop yourself on testnet with real orders
- **Week 3:** Nansen integration (or documented fallback) + rooms (P1)
- **Week 4:** P2 polish only if P0/P1 are solid, then stop building — deploy live, record the demo, write the submission, rehearse the pitch. Freeze code with a few days of margin; don't ship code changes the night before judging.

## 9. Submission checklist (from the official hackathon rules)

- [ ] Public project profile, titled **Kage**
- [ ] Working demo (live, not local)
- [ ] Written project description — lead with the curation/mobile-product framing from §2, not "copy trading on Kuru"
- [ ] Code access (open source encouraged)
- [ ] Explicitly call out Kuru, Nansen, Envio, and Privy integrations in the writeup for bounty eligibility

## 10. Working instructions for you (the agent)

- Read the existing scaffold in full before writing new code. Extend it; don't restart it.
- Where a doc page (Kuru SDK, Envio, Nansen API, Privy) has exact method signatures you need, fetch and read the real doc page rather than guessing — the package/endpoint names above are confirmed, but exact function calls are not included here on purpose.
- Work in the priority order in §5. Don't jump to P1/P2 features while a P0 checkbox is still stubbed or mocked.
- Flag blockers immediately rather than working around them with more mock data — e.g., if a Nansen key isn't available, say so and implement the fallback from §6 rather than silently shipping fake "smart money" labels.
- Keep everything non-custodial — if a design choice would require holding user funds, stop and flag it instead of implementing it.
