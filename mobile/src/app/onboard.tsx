import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mono, T } from "@/components/ui";
import { Glow, KageMark, PrimaryButton } from "@/components/visuals";
import { authEnabled, previewReason } from "@/lib/auth";
import type { PasskeyFlow } from "@/lib/privy";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const PROMISES = ["Your keys, your wallet — always", "Every order signed by you, on Kuru", "Funds are never pooled"];

// Loaded only when sign-in is enabled — see AuthProvider in app/_layout.tsx.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load in Expo Go
const privy: typeof import("@/lib/privy") | null = authEnabled ? require("@/lib/privy") : null;

function Notice({ tone, children }: { tone: "error" | "info"; children: string }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
        borderColor: tone === "error" ? "rgba(160,5,93,.4)" : t.a14,
        backgroundColor: tone === "error" ? "rgba(160,5,93,.1)" : t.a08,
      }}
    >
      <T style={{ fontSize: 13, lineHeight: 19, color: tone === "error" ? t.berryInk2 : t.ink2 }}>{children}</T>
    </View>
  );
}

// Real passkey sign-in (dev build with Privy configured).
function PasskeyActions() {
  const [error, setError] = useState<string | null>(null);
  const flow: PasskeyFlow = privy!.usePasskeyFlow({
    onDone: () => router.replace("/smart"),
    onError: (e) => setError(privy!.describeAuthError(e)),
  });
  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      <PrimaryButton
        label={flow.busy ? "Waiting for passkey…" : "Continue with passkey"}
        height={58}
        fontSize={16.5}
        disabled={flow.busy}
        onPress={() => {
          setError(null);
          void flow.continueWithPasskey();
        }}
      />
    </>
  );
}

// Expo Go / setup incomplete: say so, then continue without an account.
function PreviewActions() {
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!previewing) return;
    const id = setTimeout(() => router.replace("/smart"), 1600);
    return () => clearTimeout(id);
  }, [previewing]);
  return (
    <>
      {previewing && <Notice tone="error">{`Preview — ${previewReason} Continuing without an account.`}</Notice>}
      <PrimaryButton
        label={previewing ? "Opening Kage…" : "Continue with passkey"}
        height={58}
        fontSize={16.5}
        disabled={previewing}
        onPress={() => setPreviewing(true)}
      />
    </>
  );
}

// Design screen 01. Privy embedded wallet minted behind a passkey — no seed
// phrase surface exists in the flow.
export default function Onboard() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.inv, overflow: "hidden", paddingTop: insets.top }}>
      <Glow size={520} color="#836EF9" opacity={0.3} fade={0.68} style={{ top: -120, left: -60 }} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 38 }}>
        <KageMark size={108} offset={11} shadowColor={t.markShadow} drift />
        <T style={{ marginTop: 34, fontSize: 40, fontFamily: fonts.semibold, letterSpacing: -1.6 }}>Kage</T>
        <T style={{ marginTop: 14, fontSize: 15.5, lineHeight: 23, color: t.ink3, fontFamily: fonts.light, textAlign: "center" }}>
          Shadow the wallets Nansen already calls smart money.
        </T>
      </View>

      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 42, gap: 14 }}>
        <View style={{ gap: 10, marginBottom: 8 }}>
          {PROMISES.map((line) => (
            <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
              <View style={{ width: 6, height: 6, backgroundColor: t.purp, transform: [{ rotate: "45deg" }] }} />
              <T style={{ fontSize: 13.5, color: t.ink2 }}>{line}</T>
            </View>
          ))}
        </View>

        {authEnabled ? <PasskeyActions /> : <PreviewActions />}

        <Mono style={{ textAlign: "center", fontSize: 10.5, letterSpacing: 1, color: t.ink6, marginTop: 4 }}>
          NO SEED PHRASE · NO CUSTODY · MONAD MAINNET
        </Mono>
      </View>
    </View>
  );
}
