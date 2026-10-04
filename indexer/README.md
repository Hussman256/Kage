# Kage indexer (Envio HyperIndex)

Indexes Kuru's order books on Monad mainnet (chain 143) for the Kage app: MON/USDC, cbBTC/USDC, WETH/USDC and XAUt0/USDC (every Kuru market with trades as of 2026-10-03).

- `TakerTrade`: one trader's fills in one tx on one side, merged (volume-weighted). Feeds 1H rankings and trader pages.
- `TraderHour` / `TraderDay`: per-trader buy/sell buckets. Feed the 24H and 7D leaderboards.
- `MarketHour`: hourly last price, used to mark PnL curves.
- `Trader`: lifetime taker/maker counts. The app uses `makerFills` and `viaMakerFills` to exclude market-making bots.

Only the `Trade` event is indexed: resting-order events are ~all market-maker traffic and would multiply the event count. Units are documented at the top of `schema.graphql`. The aggregation logic lives in `src/aggregate.ts` (no envio imports), so it can be replayed against real logs outside the indexer.

## Running

`envio` ships Linux and macOS binaries only, so on Windows run it in WSL or deploy straight to Envio Cloud. Local runs need Docker and an `ENVIO_API_TOKEN` (free at https://envio.dev/app/api-tokens) in `.env`:

```bash
pnpm install
pnpm codegen
pnpm dev        # Hasura at http://localhost:8080, password: testing
```

## Deploying to Envio Cloud

1. Log in at https://envio.dev/app/login with the GitHub account that owns the repo, and install the Envio Deployments GitHub App for `Hussman256/Kage`.
2. Add an indexer with **Indexer Directory** `indexer`, **Config File** `config.yaml`, and a **dedicated deployment branch** (e.g. `envio`).
3. Push to that branch. Every push re-indexes from `start_block`, which costs events and uses one of 3 deployment slots, so only push there on purpose.
4. Copy the GraphQL endpoint into `mobile/.env.local` as `EXPO_PUBLIC_INDEXER_URL`.

Volume (measured 2026-10-03): MON/USDC does ~15k `Trade` events a day and the other three markets add ~40%, so ~21k/day in total. The free Development plan soft-limits at 100k events processed (then 7 days' grace, 3 days read-only, deletion) and deletes any deployment after 30 days, so a free deployment lasts about 4–5 days before the grace period starts.
