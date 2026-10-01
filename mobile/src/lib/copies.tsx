import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Copies the user has placed, persisted on the device. The chain is the source
// of truth for fills; this is the user's ledger of *why* (which shadow) and
// when, which the chain can't tell us. Feeds the Book screen and expiry.

export type CopyRecord = {
  id: string; // order tx hash
  market: string;
  pair: string;
  base: string;
  isBuy: boolean;
  price: number;
  size: number;
  filledSize: number; // at placement; Book refreshes from chain later
  orderId: string | null; // resting order id (bigint as string), null if filled outright
  shadowing: string; // trader address copied
  guardPct: number | null; // drift guard at placement
  createdAt: number;
  status: "open" | "filled" | "cancelled";
};

const KEY = "kage.copies.v1";

type Ctx = {
  copies: CopyRecord[];
  add: (c: Omit<CopyRecord, "createdAt">) => void; // stamps createdAt
  update: (id: string, patch: Partial<CopyRecord>) => void;
};

const CopiesContext = createContext<Ctx>({ copies: [], add: () => {}, update: () => {} });

export function CopiesProvider({ children }: { children: ReactNode }) {
  const [copies, setCopies] = useState<CopyRecord[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setCopies(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const persist = (next: CopyRecord[]) => {
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  const add = useCallback(
    (c: Omit<CopyRecord, "createdAt">) => setCopies((prev) => persist([{ ...c, createdAt: Date.now() }, ...prev])),
    [],
  );
  const update = useCallback(
    (id: string, patch: Partial<CopyRecord>) => setCopies((prev) => persist(prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))),
    [],
  );

  return <CopiesContext.Provider value={{ copies, add, update }}>{children}</CopiesContext.Provider>;
}

export const useCopies = () => useContext(CopiesContext);
