import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, DataBadge, Mono, SideChip, T } from "@/components/ui";
import { SettingsButton } from "@/components/visuals";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const WATCHLIST = ["shogun.mon", "0xdeep…41a", "tessellate.mon"];

// Design screen 09 (P1). A shared watchlist plus a feed of setups — the social
// layer. Static sample until create/join and room state are built.
export default function Rooms() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const stacked = (child: React.ReactNode, first = false) => (
    <View style={{ marginLeft: first ? 0 : -9, borderRadius: 11, borderWidth: 2, borderColor: t.ring }}>{child}</View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.inv }} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 28 }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Dojo</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable style={{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: "rgba(131,110,249,.4)" }}>
              <Mono style={{ fontSize: 11, color: t.purp }}>+ NEW ROOM</Mono>
            </Pressable>
            <SettingsButton />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <DataBadge label="SAMPLE ROOM · P1, NOT WIRED UP" />
      </View>

      <View style={{ paddingHorizontal: 22 }}>
        <LinearGradient
          colors={["rgba(131,110,249,.2)", "rgba(160,5,93,.12)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(131,110,249,.3)" }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <T style={{ fontSize: 21, fontFamily: fonts.semibold, letterSpacing: -0.5 }}>Night Watch</T>
              <Mono style={{ fontSize: 11, color: t.ink2, marginTop: 7 }}>CODE KAGE-7F2 · 12 MEMBERS</Mono>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Mono style={{ fontSize: 9.5, letterSpacing: 0.8, color: t.ink2 }}>ROOM PNL 7D</Mono>
              <Mono style={{ fontSize: 21, fontFamily: fonts.monoSemibold, color: t.grn2, marginTop: 5 }}>+12.4%</Mono>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18 }}>
            {stacked(<Avatar size={30} radius={9} />, true)}
            {stacked(<Avatar size={30} radius={9} colors={[t.berry, t.purp]} />)}
            {stacked(<Avatar size={30} radius={9} colors={[t.purpAlt, t.berry]} />)}
            {stacked(
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.a14, alignItems: "center", justifyContent: "center" }}>
                <Mono style={{ fontSize: 10 }}>+9</Mono>
              </View>,
            )}
          </View>
        </LinearGradient>
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
        <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5, marginBottom: 13 }}>SHARED WATCHLIST</Mono>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {WATCHLIST.map((h) => (
            <Mono key={h} style={{ fontSize: 11.5, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 10, overflow: "hidden", backgroundColor: t.card, borderWidth: 1, borderColor: t.a10 }}>
              {h}
            </Mono>
          ))}
        </View>

        <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5, marginTop: 24, marginBottom: 13 }}>SETUPS SHARED</Mono>
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <T style={{ fontSize: 14, fontFamily: fonts.semibold }}>rin.mon shared a setup</T>
              <Mono style={{ fontSize: 10.5, color: t.ink6 }}>3m</Mono>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 }}>
              <SideChip isBuy text="BUY" />
              <T style={{ fontSize: 15, fontFamily: fonts.semibold }}>WMON/USDC</T>
              <Mono style={{ fontSize: 12, color: t.ink3 }}>@ 0.04052</Mono>
            </View>
            <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
              <Pressable style={({ pressed }) => ({ flex: 1, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.purpHov : t.purp })}>
                <T style={{ fontSize: 14, fontFamily: fonts.semibold, color: t.inv }}>Copy setup</T>
              </Pressable>
              <Pressable style={{ height: 40, paddingHorizontal: 15, borderRadius: 11, borderWidth: 1, borderColor: t.a16, justifyContent: "center" }}>
                <Mono style={{ fontSize: 12, color: t.ink2 }}>DETAIL</Mono>
              </Pressable>
            </View>
          </View>

          <View style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 16, opacity: 0.72 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <T style={{ fontSize: 14, fontFamily: fonts.semibold }}>kaze.mon copied shogun.mon</T>
              <Mono style={{ fontSize: 10.5, color: t.ink6 }}>18m</Mono>
            </View>
            <Mono style={{ fontSize: 12, color: t.ink3, marginTop: 11 }}>312.50 MON @ 0.04180 · FILLED 388ms</Mono>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
