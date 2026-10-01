import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Wallets the user shadows, persisted on the device. Stored lowercased.
// Local-only for now; moves to the user's account once sign-in is live.

const KEY = "kage.follows.v1";

type Ctx = {
  follows: Set<string>;
  isFollowing: (address: string) => boolean;
  toggle: (address: string) => void;
};

const FollowsContext = createContext<Ctx>({ follows: new Set(), isFollowing: () => false, toggle: () => {} });

export function FollowsProvider({ children }: { children: ReactNode }) {
  const [follows, setFollows] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setFollows(new Set((JSON.parse(raw) as string[]).map((a) => a.toLowerCase())));
      })
      .catch(() => {}); // unreadable storage: start with no follows
  }, []);

  const toggle = useCallback((address: string) => {
    const a = address.toLowerCase();
    setFollows((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isFollowing = useCallback((address: string) => follows.has(address.toLowerCase()), [follows]);

  return <FollowsContext.Provider value={{ follows, isFollowing, toggle }}>{children}</FollowsContext.Provider>;
}

export const useFollows = () => useContext(FollowsContext);
