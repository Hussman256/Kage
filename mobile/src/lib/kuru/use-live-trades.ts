import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe, type TradesSnapshot } from "./live-trades";

const serverSnapshot: TradesSnapshot = { trades: [], headBlock: null, status: "idle", error: null };

export function useLiveTrades() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
