# Kage mobile app

The Kage Android app (Expo SDK 57, React Native 0.86). See the [root README](../README.md) for what Kage is, its architecture and the sponsor integrations, and `AGENTS.md` before changing Expo code.

```bash
npm install
cp .env.example .env.local
npx expo start                        # Expo Go on Android (paper mode; no passkeys)
npx tsc --noEmit && npx expo lint && npx expo-doctor
npx expo export --platform android    # full compile check
```

- `src/app/`: routes (Expo Router)
- `src/lib/kuru/`: Kuru reads, order planning, dry-run, execution, the indexer client, leaderboard, live feed and bot filter
- `src/components/`: copy sheet, result screen and shared UI
- `src/theme/`: design tokens and persisted settings

Install packages with `npx expo install`. viem is pinned to 2.56.0 for Privy.
