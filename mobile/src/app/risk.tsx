import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Slider } from "@/components/slider";
import { Mono, T } from "@/components/ui";
import { Switch } from "@/components/visuals";
import { useSettings } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const RATIOS = [0.25, 0.5, 1, 2] as const;

// Design screen 08. Rate limiting and the drift guard are first-class settings,
// not fine print. Opened from Settings. All persisted.
export default function Risk() {
  const { t, settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/settings"));

  const card = { borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 18 } as const;

  const toggleRow = (title: string, sub: string, on: boolean, key: "autoCancel" | "driftGuard" | "rateLimit", first = false) => (
    <View
      style={[
        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
        !first && { paddingTop: 16, borderTopWidth: 1, borderTopColor: t.a08 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>{title}</T>
        <Mono style={{ fontSize: 10.5, color: t.ink6, marginTop: 5 }}>{sub}</Mono>
      </View>
      <Switch on={on} onChange={(v) => update({ [key]: v })} />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.inv }} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 28 }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <Pressable onPress={back} hitSlop={12} style={{ alignSelf: "flex-start" }}>
          <Mono style={{ fontSize: 12, color: t.ink3 }}>← BACK</Mono>
        </Pressable>
        <T style={{ marginTop: 14, fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Risk</T>
        <T style={{ marginTop: 10, fontSize: 14, lineHeight: 21, color: t.ink4, fontFamily: fonts.light }}>
          These limits apply to every copy, on every shadow you follow.
        </T>
      </View>

      <View style={{ padding: 22, gap: 13 }}>
        <View style={card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Max order size</T>
            <Mono style={{ fontSize: 17, fontFamily: fonts.monoSemibold }}>{settings.maxOrderQuote} USDC</Mono>
          </View>
          <View style={{ marginTop: 16 }}>
            <Slider value={settings.maxOrderQuote} min={25} max={1000} step={25} onChange={(v) => update({ maxOrderQuote: v })} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <Mono style={{ fontSize: 10, color: t.ink6 }}>25</Mono>
            <Mono style={{ fontSize: 10, color: t.ink6 }}>1,000</Mono>
          </View>
        </View>

        <View style={card}>
          <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Default copy ratio</T>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {RATIOS.map((r) => {
              const active = r === settings.ratio;
              return (
                <Pressable
                  key={r}
                  onPress={() => update({ ratio: r })}
                  style={{
                    flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center",
                    backgroundColor: active ? t.purp : "transparent", borderWidth: active ? 0 : 1, borderColor: t.a14,
                  }}
                >
                  <Mono style={{ fontSize: 12.5, color: active ? t.inv : t.ink3, fontFamily: active ? fonts.monoBold : fonts.mono }}>{r * 100}%</Mono>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[card, { gap: 16 }]}>
          {/* Copies follow trades, not resting orders, so there's no source order to
              mirror a cancel from — stale copies expire instead. */}
          {toggleRow("Expire unfilled copies", "CANCEL IF NOT FILLED IN 10 MIN", settings.autoCancel, "autoCancel", true)}
          {toggleRow("Price-drift guard", `CANCEL IF MID MOVES > ${settings.driftGuardPct}%`, settings.driftGuard, "driftGuard")}
          {toggleRow("Rate limit", "MAX 6 COPIES PER MINUTE", settings.rateLimit, "rateLimit")}
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: "rgba(160,5,93,.4)", backgroundColor: "rgba(160,5,93,.1)", padding: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T style={{ fontSize: 14.5, fontFamily: fonts.medium, color: t.berryInk2 }}>Paper mode</T>
            <Switch on={settings.paperMode} onChange={(v) => update({ paperMode: v })} />
          </View>
          <Mono style={{ fontSize: 10.5, lineHeight: 17, color: t.berryInk3, marginTop: 8 }}>
            SIMULATE COPIES AGAINST REAL LIVE KURU DATA. NOTHING IS SIGNED.
          </Mono>
        </View>
      </View>
    </ScrollView>
  );
}
