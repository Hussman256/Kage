import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  createSecp256k1SigningSession,
  isMeraError,
  type PasskeyCredentialMetadata,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { reactNativeWebAuthnClient } from "@category-labs/mera/react-native-webauthn-client";
import { useEffect, useState, type ReactNode } from "react";
import { createWalletClient, http, type Address, type Hash, type Hex } from "viem";
import type { TxSender } from "@/lib/kuru/execute";
import { monad } from "@/lib/monad";
import { PASSKEY_RELYING_PARTY, useSetSession } from "./auth";

const STORAGE_KEY = "@kage_mera_credential_v1";

type StoredCredential = PasskeyCredentialMetadata & {
  address: Address;
};

// Rebuilds a Viem account and TxSender from a 32-byte PRF output.
export function createSenderFromPrf(prfOutput: Uint8Array): {
  address: Address;
  sender: TxSender;
  endSession: () => void;
} {
  const session = createSecp256k1SigningSession({ privateKey: prfOutput });
  const account = toViemAccount(session);
  const walletClient = createWalletClient({
    account,
    chain: monad,
    transport: http(process.env.EXPO_PUBLIC_MONAD_RPC_URL || undefined),
  });

  const sender: TxSender = {
    address: account.address,
    sendTransaction: async ({ to, data, value }: { to: Address; data: Hex; value: bigint }) => {
      const hash = await walletClient.sendTransaction({
        to,
        data,
        value,
      });
      return hash as Hash;
    },
  };

  return {
    address: account.address,
    sender,
    endSession: () => session.end(),
  };
}

let activeEndSession: (() => void) | null = null;

export function MeraAuthProvider({ children }: { children: ReactNode }) {
  const setSession = useSetSession();

  useEffect(() => {
    async function restore() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setSession({ ready: true, authenticated: false, address: null, sender: null, logout: async () => {} });
          return;
        }
        const stored: StoredCredential = JSON.parse(raw);
        setSession({
          ready: true,
          authenticated: false,
          address: stored.address,
          sender: null,
          logout: async () => {
            if (activeEndSession) {
              activeEndSession();
              activeEndSession = null;
            }
            await AsyncStorage.removeItem(STORAGE_KEY);
            setSession({ ready: true, authenticated: false, address: null, sender: null, logout: async () => {} });
          },
        });
      } catch {
        setSession({ ready: true, authenticated: false, address: null, sender: null, logout: async () => {} });
      }
    }
    void restore();
  }, [setSession]);

  return <>{children}</>;
}

export type PasskeyFlow = {
  continueWithPasskey: () => Promise<void>;
  busy: boolean;
};

export function usePasskeyFlow(opts: { onDone: () => void; onError: (e: unknown) => void }): PasskeyFlow {
  const setSession = useSetSession();
  const [busy, setBusy] = useState(false);

  const continueWithPasskey = async () => {
    setBusy(true);
    try {
      const rpId = PASSKEY_RELYING_PARTY || "usekage.xyz";
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let prfBytes: Uint8Array;
      let credMeta: PasskeyCredentialMetadata;

      if (raw) {
        const stored: StoredCredential = JSON.parse(raw);
        try {
          const res = await getPasskeyPrfOutput({
            rpId,
            credential: {
              credentialId: stored.credentialId,
              ...(stored.transports ? { transports: stored.transports } : {}),
            },
            webAuthnClient: reactNativeWebAuthnClient,
          });
          prfBytes = res.prfOutput;
          credMeta = stored;
        } catch (e) {
          if (isNotFoundOrCanceled(e)) {
            const res = await createPasskeyWithPrfOutput({
              rp: { id: rpId, name: "Kage" },
              user: { name: "trader", displayName: "Kage Trader" },
              webAuthnClient: reactNativeWebAuthnClient,
            });
            prfBytes = res.prfOutput;
            credMeta = { credentialId: res.credentialId, ...(res.transports ? { transports: res.transports } : {}) };
          } else {
            throw e;
          }
        }
      } else {
        const res = await createPasskeyWithPrfOutput({
          rp: { id: rpId, name: "Kage" },
          user: { name: "trader", displayName: "Kage Trader" },
          webAuthnClient: reactNativeWebAuthnClient,
        });
        prfBytes = res.prfOutput;
        credMeta = { credentialId: res.credentialId, ...(res.transports ? { transports: res.transports } : {}) };
      }

      const { address, sender, endSession } = createSenderFromPrf(prfBytes);
      activeEndSession = endSession;

      const stored: StoredCredential = {
        ...credMeta,
        address,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      const logout = async () => {
        if (activeEndSession) {
          activeEndSession();
          activeEndSession = null;
        }
        await AsyncStorage.removeItem(STORAGE_KEY);
        setSession({ ready: true, authenticated: false, address: null, sender: null, logout: async () => {} });
      };

      setSession({
        ready: true,
        authenticated: true,
        address,
        sender,
        logout,
      });

      opts.onDone();
    } catch (err) {
      opts.onError(err);
    } finally {
      setBusy(false);
    }
  };

  return { continueWithPasskey, busy };
}

export function describeAuthError(e: unknown): string {
  if (isMeraError(e)) {
    if (e.code === "PASSKEY_OPERATION_FAILED") {
      const cause = (e as unknown as { cause?: { message?: string } }).cause?.message;
      return cause || e.message || "Passkey canceled or not available.";
    }
    if (e.code === "PRF_UNAVAILABLE") return "Biometric security extension (PRF) not supported on this authenticator.";
    return `Passkey error: ${e.message}`;
  }
  const text = e instanceof Error ? e.message : String(e);
  if (/cancel/i.test(text)) return "Passkey prompt was canceled.";
  return text || "Failed to authenticate with passkey.";
}

function isNotFoundOrCanceled(e: unknown): boolean {
  const text = e instanceof Error ? e.message : String(e);
  return /no credential|not found|not recognized|NoCredentials/i.test(text);
}
