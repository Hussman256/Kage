import Constants, { ExecutionEnvironment } from "expo-constants";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { TxSender } from "@/lib/kuru/execute";

// One session shape for the whole app, whether sign-in is real (Mera
// passkeys in the standalone/preview build) or unavailable (Expo Go).

export const PASSKEY_RELYING_PARTY = (process.env.EXPO_PUBLIC_PASSKEY_RELYING_PARTY || "usekage.xyz")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Why real sign-in is off, or null when it's on. Expo Go can't load the native
// passkey module, so Mera must never be imported there.
export const previewReason: string | null = IS_EXPO_GO
  ? "Running in Expo Go — passkeys need the Kage preview/production build."
  : null;

export const authEnabled = previewReason === null;

export type Session = {
  ready: boolean;
  authenticated: boolean;
  address: string | null; // embedded wallet
  sender: TxSender | null; // signs with the user's embedded wallet; null until signed in
  logout: () => Promise<void>;
};

const previewSession: Session = { ready: true, authenticated: false, address: null, sender: null, logout: async () => {} };

const SessionContext = createContext<{ session: Session; setSession: (s: Session) => void }>({
  session: previewSession,
  setSession: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(
    authEnabled ? { ready: false, authenticated: false, address: null, sender: null, logout: async () => {} } : previewSession,
  );
  return <SessionContext.Provider value={{ session, setSession }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext).session;
export const useSetSession = () => useContext(SessionContext).setSession;
