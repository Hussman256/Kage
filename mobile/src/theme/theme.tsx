import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { RISK_DEFAULTS } from "@/lib/copy-sizing";
import { dark, light, type Tokens } from "./tokens";

// App-wide preferences, persisted on the device: appearance plus the Risk
// screen's settings, so both survive restarts.

export type Scheme = "dark" | "light";
export type Appearance = "system" | Scheme;

export type Settings = {
  appearance: Appearance;
  maxOrderQuote: number; // USDC
  ratio: number; // default copy ratio, e.g. 0.5
  autoCancel: boolean; // expire unfilled copies after 10 minutes
  driftGuard: boolean;
  driftGuardPct: number;
  rateLimit: boolean;
  paperMode: boolean;
};

const DEFAULTS: Settings = {
  appearance: "system", // follow the phone, like most apps
  maxOrderQuote: RISK_DEFAULTS.maxOrderQuote,
  ratio: RISK_DEFAULTS.ratio,
  autoCancel: true,
  driftGuard: true,
  driftGuardPct: RISK_DEFAULTS.driftGuardPct,
  rateLimit: true,
  paperMode: false,
};

const KEY = "kage.settings.v1";

type Ctx = {
  t: Tokens;
  scheme: Scheme; // what's actually on screen
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  loaded: boolean;
};

const SettingsContext = createContext<Ctx>({
  t: dark,
  scheme: "dark",
  settings: DEFAULTS,
  update: () => {},
  loaded: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        // Earlier builds stored a fixed `scheme`; carry it over as the choice.
        if (!saved.appearance && (saved.scheme === "dark" || saved.scheme === "light")) saved.appearance = saved.scheme;
        delete saved.scheme;
        setSettings({ ...DEFAULTS, ...saved });
      })
      .catch(() => {}) // corrupt or unavailable storage: keep defaults
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Dark is the design's primary theme, so it's the fallback when the phone
  // doesn't report a preference.
  const scheme: Scheme = settings.appearance === "system" ? (system === "light" ? "light" : "dark") : settings.appearance;

  return (
    <SettingsContext.Provider value={{ t: scheme === "dark" ? dark : light, scheme, settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useTheme = () => useContext(SettingsContext);
export const useSettings = () => useContext(SettingsContext);
