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
