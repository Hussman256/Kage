import * as WebBrowser from "expo-web-browser";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fmtAmount, fmtPrice } from "@/lib/format";
import { monad } from "@/lib/monad";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import type { CopyOutcome } from "./copy-sheet";
import { Mono, T } from "./ui";
import { Glow, GhostButton, PrimaryButton } from "./visuals";

// Design screen 06. For a live copy: what actually happened on-chain (filled
// now, resting on the book, or both) with the tx. For a paper copy: what
// would have been sent, and plainly that nothing was signed.
export function ReadyModal({ outcome, onClose }: { outcome: CopyOutcome | null; onClose: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!outcome) return <Modal visible={false} />;
  const { order } = outcome;
  const live = outcome.kind === "live";
  const r = live ? outcome.result : null;
  const size = live ? outcome.size : outcome.copy.size;
  const price = live ? outcome.price : order.price;
  const filledAll = !!r && r.restingSize === 0 && r.filledSize > 0;

  const title = !live ? "Shadow ready" : filledAll ? "Shadow filled" : r!.filledSize > 0 ? "Shadow partly filled" : "Shadow placed";
  const badge = !live
    ? { text: "NOT SIGNED · PAPER COPY", fg: t.berryInk, bg: "rgba(160,5,93,.12)", border: "rgba(240,140,190,.4)" }
    : filledAll
      ? { text: "FILLED ON KURU", fg: t.grn, bg: t.g12, border: t.g35 }
      : { text: "RESTING ON KURU AT YOUR PRICE", fg: t.purpInk, bg: "rgba(131,110,249,.12)", border: "rgba(131,110,249,.4)" };

  const rows: [string, string, string][] = [
    ["PAIR", order.pair, t.ink],
    ["SIDE", order.isBuy ? "BUY LIMIT" : "SELL LIMIT", order.isBuy ? t.grn : t.berryInk],
    ["YOUR ORDER", `${fmtAmount(size)} ${order.base} @ ${fmtPrice(price, 6)}`, t.ink],
    ...(r
      ? ([
          ["FILLED NOW", `${fmtAmount(r.filledSize)} ${order.base}`, r.filledSize > 0 ? t.grn : t.ink4],
          ["RESTING", `${fmtAmount(r.restingSize)} ${order.base}`, r.restingSize > 0 ? t.ink : t.ink4],
        ] as [string, string, string][])
      : ([["VALUE", `≈ ${fmtAmount(price * size)} USDC`, t.ink]] as [string, string, string][])),
    ["SHADOWING", order.who, t.ink],
  ];

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.inv, overflow: "hidden" }}>
        <Glow size={600} color={live ? t.grn : t.berry} opacity={0.14} style={{ top: 120, left: width / 2 - 300 }} />
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 34, paddingHorizontal: 26 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 104, height: 104, borderRadius: 32, backgroundColor: t.g12, borderWidth: 1, borderColor: t.g40, alignItems: "center", justifyContent: "center" }}>
              <T style={{ fontSize: 44, color: t.grn }}>✓</T>
            </View>
            <T style={{ marginTop: 28, fontSize: 31, fontFamily: fonts.semibold, letterSpacing: -1 }}>{title}</T>
            <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: badge.fg }} />
              <Mono style={{ fontSize: 13, color: badge.fg }}>{badge.text}</Mono>
            </View>
            <Mono style={{ marginTop: 12, fontSize: 10, letterSpacing: 0.8, color: t.ink6, textAlign: "center" }}>
              {outcome.kind === "paper" ? outcome.reason.toUpperCase() : "SIGNED BY YOUR WALLET · MONAD MAINNET"}
            </Mono>

            <View style={{ alignSelf: "stretch", marginTop: 34, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 20, gap: 13 }}>
              {rows.map(([k, v, col]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Mono style={{ fontSize: 12.5, color: t.ink5 }}>{k}</Mono>
                  <Mono style={{ fontSize: 12.5, color: col, flexShrink: 1, textAlign: "right" }}>{v}</Mono>
                </View>
              ))}
              {r && (
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(`${monad.blockExplorers?.default.url}/tx/${r.orderTx}`)}
                  style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 13, borderTopWidth: 1, borderTopColor: t.a09 }}
                >
                  <Mono style={{ fontSize: 12.5, color: t.ink5 }}>TX</Mono>
                  <Mono style={{ fontSize: 12.5, color: t.purp }}>{`${r.orderTx.slice(0, 6)}…${r.orderTx.slice(-4)} ↗`}</Mono>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ gap: 11 }}>
            <PrimaryButton label="Back to feed" onPress={onClose} glow={false} />
            <GhostButton label="Share into room ↗" disabled />
          </View>
        </View>
      </View>
    </Modal>
  );
}
