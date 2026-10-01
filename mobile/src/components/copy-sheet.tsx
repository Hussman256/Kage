import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copySize, type CopySize } from "@/lib/copy-sizing";
import { useSession } from "@/lib/auth";
import { fmtAmount, fmtPrice, shortAddr } from "@/lib/format";
import { useSettings } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import { Avatar, Chip, Mono, SideChip, T } from "./ui";

const RATIOS = [0.25, 0.5, 1, 2] as const;

export type CopySource = {
  who: string;
  label: string;
  isBuy: boolean;
  pair: string;
  base: string;
  size: number;
  price: number;
  age: string;
  minSize: number;
};

export function CopySheet({
  order,
  onClose,
  onConfirm,
}: {
  order: CopySource | null;
  onClose: () => void;
  onConfirm: (order: CopySource, copy: CopySize) => void;
}) {
  const { t, settings } = useSettings();
  const session = useSession();
  const insets = useSafeAreaInsets();
  // Starts at the Risk screen default; the parent remounts the sheet per order.
  const [ratio, setRatio] = useState<number>(settings.ratio);

  const copy = order
    ? copySize(order.size, order.price, ratio, { maxOrderQuote: settings.maxOrderQuote, minSize: order.minSize })
    : null;

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={onClose}>
          <LinearGradient colors={[t.scrim2, t.scrim1]} style={{ flex: 1 }} />
        </Pressable>

        {order && copy && (
          <View
            style={{
              backgroundColor: t.panel, borderTopLeftRadius: 34, borderTopRightRadius: 34,
              borderTopWidth: 1, borderColor: "rgba(131,110,249,.3)",
              paddingHorizontal: 22, paddingTop: 14, paddingBottom: insets.bottom + 28,
            }}
          >
            <View style={{ alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: t.a22, marginBottom: 20 }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T style={{ fontSize: 25, fontFamily: fonts.semibold, letterSpacing: -0.75 }}>Copy this trade</T>
              <Mono style={{ fontSize: 10.5, color: t.ink5 }}>SOURCE · {order.age} AGO</Mono>
            </View>

            <View style={{ marginTop: 18, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar />
                <Mono style={{ fontSize: 14, fontFamily: fonts.monoSemibold }}>{order.who}</Mono>
                <Chip label={order.label} bg={t.a10} color={t.ink4} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                <SideChip isBuy={order.isBuy} text={order.isBuy ? "BOUGHT" : "SOLD"} />
                <T style={{ fontSize: 19, fontFamily: fonts.semibold, letterSpacing: -0.4 }}>{order.pair}</T>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
                <Mono style={{ fontSize: 12.5, color: t.ink3 }}>{fmtAmount(order.size)} {order.base}</Mono>
                <Mono style={{ fontSize: 12.5, color: t.ink3 }}>@ {fmtPrice(order.price)}</Mono>
              </View>
            </View>

            <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
              <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5 }}>YOUR RATIO</Mono>
              <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.purp }}>MAX {settings.maxOrderQuote} USDC</Mono>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 11 }}>
              {RATIOS.map((r) => {
                const active = r === ratio;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRatio(r)}
                    style={{
                      flex: 1, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center",
                      backgroundColor: active ? t.purp : "transparent", borderWidth: active ? 0 : 1, borderColor: t.a14,
                    }}
                  >
                    <Mono style={{ fontSize: 13, color: active ? t.inv : t.ink3, fontFamily: active ? fonts.monoBold : fonts.mono }}>
                      {r * 100}%
                    </Mono>
                  </Pressable>
                );
              })}
            </View>

            <LinearGradient
              colors={["rgba(131,110,249,.16)", "rgba(131,110,249,.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: "rgba(131,110,249,.26)", paddingVertical: 18, paddingHorizontal: 16 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <View>
                  <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.purpInk }}>YOUR SIZE</Mono>
                  <Mono style={{ fontSize: 31, fontFamily: fonts.monoSemibold, marginTop: 7, letterSpacing: -0.6 }}>{fmtAmount(copy.size)}</Mono>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Mono style={{ fontSize: 11.5, color: t.ink2, lineHeight: 22 }}>{order.base}</Mono>
                  <Mono style={{ fontSize: 11.5, color: t.ink2, lineHeight: 22 }}>≈ {fmtAmount(copy.quoteValue)} USDC</Mono>
                </View>
              </View>
              {(copy.capped || copy.belowMin) && (
                <Mono style={{ marginTop: 10, fontSize: 10, letterSpacing: 0.5, color: copy.belowMin ? t.berryInk : t.ink4 }}>
                  {copy.belowMin ? `BELOW KURU MINIMUM OF ${fmtAmount(order.minSize)} ${order.base}` : "CAPPED AT YOUR MAX ORDER SIZE"}
                </Mono>
              )}
            </LinearGradient>

            <View style={{ gap: 9, marginTop: 16 }}>
              {[
                ["YOUR ORDER", `${order.isBuy ? "BUY" : "SELL"} LIMIT @ ${fmtPrice(order.price)}`, order.isBuy ? t.grn : t.berryInk],
                ["CANCEL IF PRICE MOVES >", settings.driftGuard ? `${settings.driftGuardPct}%` : "OFF", settings.driftGuard ? t.ink : t.ink4],
                ["SIGNED BY", session.address ? `YOUR WALLET · ${shortAddr(session.address)}` : "YOUR WALLET", t.ink],
              ].map(([k, v, c]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Mono style={{ fontSize: 11, color: t.ink4 }}>{k}</Mono>
                  <Mono style={{ fontSize: 11, color: c }}>{v}</Mono>
                </View>
              ))}
            </View>

            <Pressable
              disabled={copy.belowMin}
              onPress={() => onConfirm(order, copy)}
              style={({ pressed }) => ({
                marginTop: 18, height: 60, borderRadius: 17, alignItems: "center", justifyContent: "center",
                backgroundColor: pressed ? t.purpHov : t.purp, opacity: copy.belowMin ? 0.5 : 1,
              })}
            >
              <T style={{ fontSize: 17, fontFamily: fonts.semibold, color: t.inv }}>{"Confirm & sign on Kuru"}</T>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
