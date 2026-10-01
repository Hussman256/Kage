import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DataBadge, Mono, SideChip, T } from "@/components/ui";
import { SettingsButton } from "@/components/visuals";
import { orders } from "@/lib/mock-data";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const TABS = [`Open · ${orders.length}`, "Filled", "Cancelled"] as const;

// Design screen 07. Every open copy names the shadow it came from and the guard
// that would cancel it. Sample data until order submission is wired.
export default function Book() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<string>(TABS[0]);

  return (
    <View style={{ flex: 1, backgroundColor: t.inv, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Your book</T>
            <SettingsButton />
          </View>

          <View style={{ flexDirection: "row", gap: 20, marginTop: 16, borderBottomWidth: 1, borderBottomColor: t.a10 }}>
            {TABS.map((x) => {
              const active = x === tab;
              return (
                <Pressable key={x} onPress={() => setTab(x)} style={{ paddingBottom: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: active ? t.purp : "transparent" }}>
                  <T style={{ fontSize: 14.5, fontFamily: active ? fonts.semibold : fonts.regular, color: active ? t.ink : t.ink5 }}>{x}</T>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            {[
              { label: "COPY PNL · 7D", value: "+84.21", color: t.grn },
              { label: "AVG FILL", value: "468ms", color: t.ink },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, borderRadius: 15, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 15 }}>
                <Mono style={{ fontSize: 9.5, letterSpacing: 0.8, color: t.ink5 }}>{s.label}</Mono>
                <Mono style={{ fontSize: 24, fontFamily: fonts.monoSemibold, marginTop: 8, color: s.color }}>{s.value}</Mono>
              </View>
            ))}
          </View>
        </View>

        <DataBadge label="SAMPLE DATA · NOT LIVE" />

        {tab === TABS[0] ? (
          <View style={{ paddingHorizontal: 22, gap: 11 }}>
            {orders.map((o, i) => (
              <View key={i} style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, paddingVertical: 15, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                    <SideChip isBuy={o.side === "BUY"} text={o.side} />
                    <T style={{ fontSize: 15.5, fontFamily: fonts.semibold, letterSpacing: -0.25 }}>{o.pair}</T>
                  </View>
                  <Mono style={{ fontSize: 10.5, color: t.ink5 }}>{o.age}</Mono>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  <Mono style={{ fontSize: 12, color: t.ink3 }}>{o.size} @ {o.price}</Mono>
                  <Mono style={{ fontSize: 12, color: t.ink2 }}>{o.filled} filled</Mono>
                </View>
                <View style={{ height: 3, borderRadius: 999, backgroundColor: t.a10, marginTop: 11, overflow: "hidden" }}>
                  <View style={{ height: 3, borderRadius: 999, backgroundColor: t.purp, width: `${o.bar * 100}%` }} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 }}>
                  <Mono style={{ fontSize: 10, letterSpacing: 0.6, color: t.ink6 }}>SHADOWING {o.who} · GUARD {o.guard}</Mono>
                  <Mono style={{ fontSize: 11, color: t.berryInk }}>CANCEL</Mono>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Mono style={{ textAlign: "center", paddingVertical: 40, fontSize: 11.5, color: t.ink5 }}>
            {tab === "Filled" ? "No filled copies yet." : "No cancelled copies yet."}
          </Mono>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: t.a08 }}>
        <Pressable
          style={({ pressed }) => ({
            height: 50, borderRadius: 15, borderWidth: 1, borderColor: "rgba(160,5,93,.5)", alignItems: "center", justifyContent: "center",
            backgroundColor: pressed ? "rgba(160,5,93,.26)" : "rgba(160,5,93,.14)",
          })}
        >
          <Mono style={{ fontSize: 12.5, letterSpacing: 1.25, color: t.berryInk }}>CANCEL ALL COPIES</Mono>
        </Pressable>
      </View>
    </View>
  );
}
