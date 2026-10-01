"use client";

import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe, type FeedSnapshot } from "./live-orders";

const serverSnapshot: FeedSnapshot = { orders: [], headBlock: null, status: "idle", error: null };

export function useLiveOrders() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
