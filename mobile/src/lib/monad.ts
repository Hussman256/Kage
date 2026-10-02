import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";

export { monad };

// Kage runs on Monad mainnet: Kuru's testnet market is inactive and Nansen
// labels only exist for real mainnet wallets.
export const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.EXPO_PUBLIC_MONAD_RPC_URL || undefined),
});

// Public Monad RPCs reject eth_getLogs spans wider than 100 blocks.
export const MAX_LOG_RANGE = BigInt(100);

// Measured on mainnet 2026-10-02: 216,000 blocks took 65,224 s (≈0.30 s each).
// Used to turn block spans into time; real timestamps come from the indexer.
export const BLOCK_MS = 300;
