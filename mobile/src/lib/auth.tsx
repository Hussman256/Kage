import Constants, { ExecutionEnvironment } from "expo-constants";
import { createContext, useContext, useState, type ReactNode } from "react";

// One session shape for the whole app, whether sign-in is real (Privy
// passkeys in the dev build) or unavailable (Expo Go, or setup incomplete).

export const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? "";
export const PRIVY_CLIENT_ID = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? "";
// Origin hosting /.well-known/assetlinks.json: https://usekage.xyz. Passkeys are
// bound to this domain for good, so never switch it once users exist.
export const PASSKEY_RELYING_PARTY = process.env.EXPO_PUBLIC_PASSKEY_RELYING_PARTY ?? "";

const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Why real sign-in is off, or null when it's on. Expo Go can't load the native
// passkey module, so Privy must never be imported there.
export const previewReason: string | null = IS_EXPO_GO
  ? "Running in Expo Go — passkeys need the Kage development build."
  : !PRIVY_APP_ID || !PRIVY_CLIENT_ID
    ? "Privy app ID / client ID not configured."
    : !PASSKEY_RELYING_PARTY
      ? "Passkey domain not configured."
      : null;

export const authEnabled = previewReason === null;

export type Session = {
  ready: boolean;
  authenticated: boolean;
  address: string | null; // embedded wallet
  logout: () => Promise<void>;
};

const previewSession: Session = { ready: true, authenticated: false, address: null, logout: async () => {} };

const SessionContext = createContext<{ session: Session; setSession: (s: Session) => void }>({
  session: previewSession,
  setSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(
    authEnabled ? { ready: false, authenticated: false, address: null, logout: async () => {} } : previewSession,
  );
  return <SessionContext.Provider value={{ session, setSession }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext).session;
export const useSetSession = () => useContext(SessionContext).setSession;
