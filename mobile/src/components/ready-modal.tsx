import { Modal, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CopySize } from "@/lib/copy-sizing";
import { fmtAmount, fmtPrice } from "@/lib/format";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import type { CopySource } from "./copy-sheet";
import { Mono, T } from "./ui";
import { Glow, GhostButton, PrimaryButton } from "./visuals";

// The design's "Shadow filled" screen. Signing isn't wired yet, so it shows what
// would be submitted and says so — no invented latency, block, or tx hash.
export function ReadyModal({
  ready,
  onClose,
}: {
  ready: { order: CopySource; copy: CopySize } | null;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const o = ready?.order;
  const c = ready?.copy;

  return (
    <Modal visible={!!ready} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {o && c && (
        <View style={{ flex: 1, backgroundColor: t.inv, overflow: "hidden" }}>
          <Glow size={600} color={t.grn} opacity={0.16} style={{ top: 120, left: width / 2 - 300 }} />
          <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 34, paddingHorizontal: 26 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 104, height: 104, borderRadius: 32, backgroundColor: t.g12, borderWidth: 1, borderColor: t.g40, alignItems: "center", justifyContent: "center" }}>
              <T style={{ fontSize: 44, color: t.grn }}>✓</T>
            </View>
            <T style={{ marginTop: 28, fontSize: 31, fontFamily: fonts.semibold, letterSpacing: -1 }}>Shadow ready</T>
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: "rgba(160,5,93,.12)", borderWidth: 1, borderColor: "rgba(240,140,190,.4)" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.berryInk }} />
              <Mono style={{ fontSize: 13, color: t.berryInk }}>NOT SIGNED · PAPER COPY</Mono>
            </View>
            <Mono style={{ marginTop: 12, fontSize: 10, letterSpacing: 0.8, color: t.ink6, textAlign: "center" }}>
              KURU ORDER SUBMISSION IS THE NEXT BUILD STEP
            </Mono>

            <View style={{ alignSelf: "stretch", marginTop: 34, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 20, gap: 13 }}>
              {[
                ["PAIR", o.pair, t.ink],
                ["SIDE", o.isBuy ? "BUY LIMIT" : "SELL LIMIT", o.isBuy ? t.grn : t.berryInk],
                ["YOUR ORDER", `${fmtAmount(c.size)} ${o.base} @ ${fmtPrice(o.price)}`, t.ink],
                ["VALUE", `≈ ${fmtAmount(c.quoteValue)} USDC`, t.ink],
                ["SHADOWING", o.who, t.ink],
              ].map(([k, v, col]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Mono style={{ fontSize: 12.5, color: t.ink5 }}>{k}</Mono>
                  <Mono style={{ fontSize: 12.5, color: col, flexShrink: 1, textAlign: "right" }}>{v}</Mono>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <PrimaryButton label="Back to feed" onPress={onClose} glow={false} />
            <GhostButton label="Share into room ↗" disabled />
          </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
