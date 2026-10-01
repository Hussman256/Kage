import { LinearGradient } from "expo-linear-gradient";
import { Text, View, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

// Text with the theme's ink colour and Geist as the default face.
export function T({ style, ...rest }: TextProps) {
  const { t } = useTheme();
  return <Text {...rest} style={[{ color: t.ink, fontFamily: fonts.regular }, style]} />;
}

export function Mono({ style, ...rest }: TextProps) {
  return <T {...rest} style={[{ fontFamily: fonts.mono }, style]} />;
}

// Pill badge used for Nansen labels, sides, and statuses.
export function Chip({ label, bg, color, style }: { label: string; bg: string; color: string; style?: TextStyle }) {
  return (
    <Mono
      style={[
        { fontSize: 9.5, letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, overflow: "hidden", backgroundColor: bg, color },
        style,
      ]}
    >
      {label}
    </Mono>
  );
}

export function SideChip({ isBuy, text }: { isBuy: boolean; text: string }) {
  const { t } = useTheme();
  return (
    <Chip
      label={text}
      bg={isBuy ? t.g16 : t.berryTint18}
      color={isBuy ? t.grn : t.berryInk}
      style={{ fontSize: 11, fontFamily: fonts.monoSemibold, paddingHorizontal: 8, paddingVertical: 4 }}
    />
  );
}

// Honest-data banner: shown wherever data isn't what the final product promises.
export function DataBadge({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8,
        borderRadius: 999, borderWidth: 1, borderColor: "rgba(240,140,190,.4)", backgroundColor: "rgba(160,5,93,.12)",
        paddingHorizontal: 12, paddingVertical: 6,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.berryInk }} />
      <Mono style={{ fontSize: 10, letterSpacing: 0.5, color: t.berryInk, flexShrink: 1 }}>{label}</Mono>
    </View>
  );
}

// Purple→berry 140° gradient square used as a wallet avatar in the design.
export function Avatar({ size = 26, radius = 8, colors }: { size?: number; radius?: number; colors?: [string, string] }) {
  const { t } = useTheme();
  return (
    <LinearGradient
      colors={colors ?? [t.purp, t.berry]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}
