import { createPublicClient, defineChain, http } from "viem";

// viem 2.31 ships monadTestnet but not mainnet, so mainnet is defined here.
// Kage runs on mainnet: Kuru's testnet market is inactive and Nansen labels
// only exist for real mainnet wallets.
export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://monadvision.com" },
  },
});

export const publicClient = createPublicClient({ chain: monad, transport: http() });

// Public Monad RPCs reject eth_getLogs spans wider than 100 blocks.
export const MAX_LOG_RANGE = BigInt(100);
