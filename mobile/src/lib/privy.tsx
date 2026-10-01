// Only ever loaded via require() when `authEnabled` (see ./auth). Importing this
// in Expo Go would crash: react-native-passkeys is a native module.
import { PrivyProvider, useEmbeddedEthereumWallet, usePrivy } from "@privy-io/expo";
import { useLoginWithPasskey, useSignupWithPasskey } from "@privy-io/expo/passkey";
import { useEffect, type ReactNode } from "react";
import { toHex, type Address, type Hash } from "viem";
import type { TxSender } from "@/lib/kuru/execute";
import { monad } from "@/lib/monad";
import { PASSKEY_RELYING_PARTY, PRIVY_APP_ID, PRIVY_CLIENT_ID, useSetSession } from "./auth";

// Mirrors Privy's state into the app-wide session.
function SessionBridge() {
  const { isReady, user, logout } = usePrivy();
  const { wallets } = useEmbeddedEthereumWallet();
  const setSession = useSetSession();
  const wallet = wallets[0];
  const address = wallet?.address ?? null;

  useEffect(() => {
    // Every transaction goes through the embedded wallet's EIP-1193 provider,
    // so Privy prompts the user (passkey) to sign each one.
    const sender: TxSender | null = wallet
      ? {
          address: wallet.address as Address,
          sendTransaction: async ({ to, data, value }) => {
            const provider = await wallet.getProvider();
            const hash = await provider.request({
              method: "eth_sendTransaction",
              params: [{ from: wallet.address, to, data, value: toHex(value), chainId: toHex(monad.id) }],
            });
            return hash as Hash;
          },
        }
      : null;
    setSession({ ready: isReady, authenticated: !!user, address, sender, logout });
  }, [isReady, user, wallet, address, logout, setSession]);

  return null;
}

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      supportedChains={[monad]}
      config={{ embedded: { ethereum: { createOnLogin: "users-without-wallets" } } }}
    >
      <SessionBridge />
      {children}
    </PrivyProvider>
  );
}

export type PasskeyFlow = {
  continueWithPasskey: () => Promise<void>;
  busy: boolean;
};

// One button, two flows: try to log in with an existing passkey, and if the
// device has none for Kage, create one (sign up).
export function usePasskeyFlow(opts: { onDone: () => void; onError: (e: unknown) => void }): PasskeyFlow {
  const login = useLoginWithPasskey();
  const signup = useSignupWithPasskey();
  const busy = [login.state.status, signup.state.status].some(
    (s) => s === "generating-challenege" || s === "awaiting-passkey" || s === "submitting-response",
  );

  const continueWithPasskey = async () => {
    try {
      await login.loginWithPasskey({ relyingParty: PASSKEY_RELYING_PARTY });
      opts.onDone();
    } catch (loginErr) {
      // Only a missing passkey means "new user". Any other failure (network,
      // cancel, misconfigured domain) must not silently create a second account.
      if (!isNoCredential(loginErr)) return opts.onError(loginErr);
      try {
        await signup.signupWithPasskey({ relyingParty: PASSKEY_RELYING_PARTY });
        opts.onDone();
      } catch (signupErr) {
        opts.onError(signupErr);
      }
    }
  };

  return { continueWithPasskey, busy };
}

// react-native-passkeys rejects with these messages on Android (see its
// ReactNativePasskeysModule.kt); Privy may wrap them, so check the cause chain.
function errorText(e: unknown): string {
  const parts: string[] = [];
  for (let cur: unknown = e, i = 0; cur && i < 5; i++) {
    parts.push(cur instanceof Error ? `${cur.name} ${cur.message}` : String(cur));
    cur = cur instanceof Error ? (cur as Error & { cause?: unknown }).cause : undefined;
  }
  return parts.join(" | ");
}

const isNoCredential = (e: unknown) => /NoCredentials|no credential/i.test(errorText(e));
export const isCancel = (e: unknown) => /UserCancelled|cancel|abort|dismiss/i.test(errorText(e));

export function describeAuthError(e: unknown): string {
  const text = errorText(e);
  if (isCancel(e)) return "Passkey prompt was cancelled.";
  if (/NotSupported/i.test(text)) return "This phone doesn't support passkeys. Update Google Play services, or use a device with a screen lock set.";
  if (/DomError|relying|origin|asset|domain/i.test(text)) return "Passkey domain isn't verified yet — the app and site aren't linked. (Setup step: assetlinks.json.)";
  if (/network|fetch|timeout/i.test(text)) return "Couldn't reach Privy. Check your connection and try again.";
  return "Couldn't complete passkey sign-in. Try again.";
}
