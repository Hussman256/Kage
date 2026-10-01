"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { monad } from "@/lib/monad";

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          priceDisplay: {
            primary: "native-token",
            secondary: null,
          },
        },
        defaultChain: monad,
        supportedChains: [monad],
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
