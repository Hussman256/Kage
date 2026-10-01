import { useEffect, useId, useState } from "react";
import { Animated, Easing, Pressable, View, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { router } from "expo-router";
import { useSettings, useTheme, type Appearance } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import { SettingsIcon } from "./icons";
import { T } from "./ui";

// CSS `radial-gradient(circle, color, transparent <fade>)` — the soft washes
// behind the design's splash, onboarding, and fill screens.
export function Glow({
  size,
  color,
  opacity = 1,
  fade = 0.66,
  style,
}: {
  size: number;
  color: string;
  opacity?: number;
  fade?: number;
  style?: ViewStyle;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset={String(fade)} stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// The 影 mark with the design's hard offset shadow (a second glyph behind).
export function KageMark({
  size,
  offset,
  shadowColor,
  weight = "bold",
  drift = false,
}: {
  size: number;
  offset: number;
  shadowColor: string;
  weight?: "bold" | "black";
  drift?: boolean;
}) {
  const family = weight === "black" ? fonts.markBlack : fonts.mark;
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!drift) return;
    // kageDrift: 7s ease-in-out float of 14px.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -14, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, y]);

  const glyph = { fontFamily: family, fontSize: size, lineHeight: size * 1.15, includeFontPadding: false } as const;
  return (
    <Animated.View style={{ transform: [{ translateY: y }] }}>
      <T style={[glyph, { position: "absolute", left: offset, top: offset, color: shadowColor }]}>影</T>
      <T style={glyph}>影</T>
    </Animated.View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  height = 56,
  fontSize = 16,
  disabled,
  glow = true,
  style,
}: {
  label: string;
  onPress?: () => void;
  height?: number;
  fontSize?: number;
  disabled?: boolean;
  glow?: boolean;
  style?: ViewStyle;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height, borderRadius: 16, alignItems: "center", justifyContent: "center",
          backgroundColor: pressed ? t.purpHov : t.purp, opacity: disabled ? 0.5 : 1,
        },
        glow && { shadowColor: "#836EF9", shadowOpacity: 0.8, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
        style,
      ]}
    >
      <T style={{ fontSize, fontFamily: fonts.semibold, color: t.inv, letterSpacing: -0.15 }}>{label}</T>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center",
        borderColor: pressed ? "rgba(131,110,249,.6)" : t.a16, opacity: disabled ? 0.6 : 1,
      })}
    >
      <T style={{ fontSize: 15, fontFamily: fonts.medium, color: t.ink2 }}>{label}</T>
    </Pressable>
  );
}

// 46×27 switch from the Risk screen.
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!on)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={{ width: 46, height: 27, borderRadius: 999, backgroundColor: on ? t.purp : t.a16, justifyContent: "center" }}
    >
      <View
        style={{
          position: "absolute", top: 3, width: 21, height: 21, borderRadius: 11,
          backgroundColor: on ? t.inv : t.ink, ...(on ? { right: 3 } : { left: 3 }),
        }}
      />
    </Pressable>
  );
}

// System · Dark · Light — styled like the design's segmented ratio picker.
// Each option is its own tap target, so one tap always does what it says.
export function AppearancePicker() {
  const { t, settings, update } = useSettings();
  const options: { value: Appearance; label: string }[] = [
    { value: "system", label: "System" },
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
      {options.map(({ value, label }) => {
        const active = settings.appearance === value;
        return (
          <Pressable
            key={value}
            onPress={() => update({ appearance: value })}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center",
              backgroundColor: active ? t.purp : "transparent", borderWidth: active ? 0 : 1, borderColor: t.a14,
            }}
          >
            <T style={{ fontSize: 14, fontFamily: active ? fonts.semibold : fonts.regular, color: active ? t.inv : t.ink3 }}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// The same top-right gear on every main screen — the app's one way into Settings.
export function SettingsButton() {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      style={({ pressed }) => ({
        width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center",
        borderColor: pressed ? "rgba(131,110,249,.6)" : t.a14,
      })}
    >
      <SettingsIcon color={t.ink3} />
    </Pressable>
  );
}

// Offset "shadow" plate behind leaderboard rows — the product metaphor.
export function ShadowPlate({ children, radius = 18, offset = 7 }: { children: React.ReactNode; radius?: number; offset?: number }) {
  const { t } = useTheme();
  return (
    <View>
      <View style={{ position: "absolute", top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: radius, backgroundColor: t.rowShadow }} />
      {children}
    </View>
  );
}
