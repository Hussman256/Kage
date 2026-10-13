"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { monad } from "@/lib/monad";

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId || appId === "cl00000000000000000000000" || appId.length !== 25) {
    return <>{children}</>;
  }

  return (
    <BasePrivyProvider
      appId={appId}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || ""}
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
