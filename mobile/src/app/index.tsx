import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, View, useWindowDimensions } from "react-native";
import { Mono, T } from "@/components/ui";
import { Glow, KageMark } from "@/components/visuals";
import { useSession } from "@/lib/auth";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const HANDOFF_MS = 900;
const RESTORE_TIMEOUT_MS = 8000;

// Design screen 00 — resting handoff frame, then passkey entry (or straight
// into the app when a session is restored).
export default function Splash() {
  const { t } = useTheme();
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));

  const session = useSession();
  const [beatDone, setBeatDone] = useState(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: HANDOFF_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const id = setTimeout(() => setBeatDone(true), HANDOFF_MS);
    return () => clearTimeout(id);
  }, [progress]);

  // Hand off once the design's beat has played and the saved session (if any)
  // is restored: returning users skip passkey entry.
  useEffect(() => {
    if (beatDone && session.ready) router.replace(session.authenticated ? "/smart" : "/onboard");
  }, [beatDone, session.ready, session.authenticated]);

  // If session restore stalls (offline, Privy down), don't strand the user here.
  useEffect(() => {
    const id = setTimeout(() => router.replace("/onboard"), RESTORE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.inv, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Glow size={640} color="#836EF9" opacity={t.washO} style={{ top: 100 * (height / 844), left: width / 2 - 320 }} />
      <Glow size={460} color="#A0055D" opacity={t.berryWashO} fade={0.68} style={{ bottom: -160, left: -120 }} />

      <KageMark size={132} offset={13} shadowColor="#836EF9" weight="black" />
      <T style={{ marginTop: 44, fontSize: 52, fontFamily: fonts.semibold, letterSpacing: -2.3 }}>Kage</T>
      <Mono style={{ marginTop: 14, fontSize: 11.5, letterSpacing: 2.5, color: t.purpInk }}>SHADOW THE SMART MONEY</Mono>

      <View style={{ position: "absolute", bottom: 108, width: 116, height: 3, borderRadius: 999, backgroundColor: t.a12, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: 3, borderRadius: 999, backgroundColor: t.purp,
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }}
        />
      </View>
      <Mono style={{ position: "absolute", bottom: 56, fontSize: 10.5, letterSpacing: 2.1, color: t.ink3 }}>BUILT ON MONAD</Mono>
    </View>
  );
}
