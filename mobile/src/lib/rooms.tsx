import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { MARKETS } from "./kuru/markets";

const STORAGE_KEY = "@kage_rooms_v1";

export type RoomSetup = {
  id: string;
  author: string;
  trader: string; // address or handle
  pair: string;
  market: Address;
  base: string;
  isBuy: boolean;
  price: number;
  size: number;
  timestamp: number;
  type: "setup" | "copied";
  confirmMs?: number;
};

export type Room = {
  id: string;
  name: string;
  code: string;
  membersCount: number;
  pnl7d: number;
  watchlist: string[];
  setups: RoomSetup[];
};

const DEFAULT_ROOMS: Room[] = [
  {
    id: "night-watch",
    name: "Night Watch",
    code: "KAGE-7F2",
    membersCount: 12,
    pnl7d: 12.4,
    watchlist: [
      "0x065C9d28E428A0db40191a54d33d5b7c71a9C394",
      "0x3235b2e316a44c776097d8b5a75cf02476b72a6b",
      "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
    ],
    setups: [
      {
        id: "setup-1",
        author: "rin.mon",
        trader: "0x3235b2e316a44c776097d8b5a75cf02476b72a6b",
        pair: "MON/USDC",
        market: MARKETS[0].address,
        base: "MON",
        isBuy: true,
        price: 0.04052,
        size: 500,
        timestamp: Date.now() - 3 * 60 * 1000,
        type: "setup",
      },
      {
        id: "setup-2",
        author: "kaze.mon",
        trader: "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7",
        pair: "MON/USDC",
        market: MARKETS[0].address,
        base: "MON",
        isBuy: true,
        price: 0.0418,
        size: 312.5,
        timestamp: Date.now() - 18 * 60 * 1000,
        type: "copied",
        confirmMs: 388,
      },
    ],
  },
];

type RoomsContextValue = {
  rooms: Room[];
  activeRoom: Room;
  activeRoomId: string;
  switchRoom: (id: string) => void;
  createRoom: (name: string) => string;
  joinRoom: (code: string) => boolean;
  shareSetup: (setup: Omit<RoomSetup, "id" | "timestamp">) => void;
  addToWatchlist: (item: string) => void;
  removeFromWatchlist: (item: string) => void;
};

const RoomsContext = createContext<RoomsContextValue | null>(null);

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>("night-watch");

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRooms(parsed);
            setActiveRoomId(parsed[0].id);
          }
        }
      } catch {
        // Fall back to defaults
      }
    }
    void load();
  }, []);

  const save = (updated: Room[]) => {
    setRooms(updated);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || DEFAULT_ROOMS[0];

  const switchRoom = (id: string) => {
    if (rooms.some((r) => r.id === id)) {
      setActiveRoomId(id);
    }
  };

  const createRoom = (name: string): string => {
    const trimmed = name.trim() || "Dojo Room";
    const randCode = Math.random().toString(16).slice(2, 5).toUpperCase();
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: trimmed,
      code: `KAGE-${randCode}`,
      membersCount: 1,
      pnl7d: 0,
      watchlist: [],
      setups: [],
    };
    const updated = [newRoom, ...rooms];
    save(updated);
    setActiveRoomId(newRoom.id);
    return newRoom.id;
  };

  const joinRoom = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    const existing = rooms.find((r) => r.code.toUpperCase() === normalized);
    if (existing) {
      setActiveRoomId(existing.id);
      return true;
    }
    // Simulate joining an external room by code
    const joinedRoom: Room = {
      id: `joined-${Date.now()}`,
      name: `Dojo ${normalized}`,
      code: normalized,
      membersCount: 8,
      pnl7d: +(Math.random() * 20 - 5).toFixed(1),
      watchlist: [
        "0x065C9d28E428A0db40191a54d33d5b7c71a9C394",
        "0x3235b2e316a44c776097d8b5a75cf02476b72a6b",
      ],
      setups: [],
    };
    const updated = [joinedRoom, ...rooms];
    save(updated);
    setActiveRoomId(joinedRoom.id);
    return true;
  };

  const shareSetup = (setup: Omit<RoomSetup, "id" | "timestamp">) => {
    const newSetup: RoomSetup = {
      ...setup,
      id: `setup-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    const updated = rooms.map((r) => {
      if (r.id === activeRoom.id) {
        return {
          ...r,
          setups: [newSetup, ...r.setups],
        };
      }
      return r;
    });
    save(updated);
  };

  const addToWatchlist = (item: string) => {
    const clean = item.trim();
    if (!clean) return;
    const updated = rooms.map((r) => {
      if (r.id === activeRoom.id && !r.watchlist.includes(clean)) {
        return { ...r, watchlist: [...r.watchlist, clean] };
      }
      return r;
    });
    save(updated);
  };

  const removeFromWatchlist = (item: string) => {
    const updated = rooms.map((r) => {
      if (r.id === activeRoom.id) {
        return { ...r, watchlist: r.watchlist.filter((w) => w !== item) };
      }
      return r;
    });
    save(updated);
  };

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        activeRoom,
        activeRoomId,
        switchRoom,
        createRoom,
        joinRoom,
        shareSetup,
        addToWatchlist,
        removeFromWatchlist,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error("useRooms must be used within RoomsProvider");
  return ctx;
}
