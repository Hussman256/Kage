import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Address } from "viem";
import { copySize, type CopySize } from "@/lib/copy-sizing";
import { useSession } from "@/lib/auth";
import { useCopies } from "@/lib/copies";
import { fmtAmount, fmtPrice, fmtSize, shortAddr } from "@/lib/format";
import { CopyStepError, executeCopy, type CopyResult } from "@/lib/kuru/execute";
import { recordCopy } from "@/lib/kuru/guards";
import type { TxStep } from "@/lib/kuru/trading";
import { usePreflight } from "@/lib/kuru/use-preflight";
import { useSettings } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import { Avatar, Chip, Mono, SideChip, T } from "./ui";

const RATIOS = [0.25, 0.5, 1, 2] as const;

export type CopySource = {
  market: Address;
  trader: string; // full address of the wallet being copied
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

export type CopyOutcome =
  | { kind: "paper"; order: CopySource; copy: CopySize; reason: string }
  | { kind: "live"; order: CopySource; copy: CopySize; result: CopyResult; price: number; size: number };

const STEP_NAMES: Record<TxStep["kind"], string> = { approve: "Approve", deposit: "Deposit", order: "Place order" };

export function CopySheet({
  order,
  onClose,
  onDone,
}: {
  order: CopySource | null;
  onClose: () => void;
  onDone: (outcome: CopyOutcome) => void;
}) {
  const { t, settings } = useSettings();
  const session = useSession();
  const { add } = useCopies();
  const insets = useSafeAreaInsets();
  // Starts at the Risk screen default; the parent remounts the sheet per order.
  const [ratio, setRatio] = useState<number>(settings.ratio);
  const [progress, setProgress] = useState<{ step: TxStep; state: "signing" | "confirming" | "done" } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const copy = order
    ? copySize(order.size, order.price, ratio, { maxOrderQuote: settings.maxOrderQuote, minSize: order.minSize })
    : null;

  const { preflight, checking, error } = usePreflight(
    order && copy && !copy.belowMin
      ? {
          market: order.market,
          isBuy: order.isBuy,
          price: order.price,
          size: copy.size,
          user: (session.address as Address | null) ?? null,
          driftGuard: settings.driftGuard,
          driftGuardPct: settings.driftGuardPct,
          rateLimit: settings.rateLimit,
        }
      : null,
  );

  const live = !!session.sender && !settings.paperMode;
  const busy = !!progress && progress.state !== "done";
  const blocked = !copy || copy.belowMin || checking || !!error || !preflight || preflight.problems.length > 0;

  const confirm = async () => {
    if (!order || !copy || !preflight || blocked) return;
    setExecError(null);
    if (!live) {
      await recordCopy();
      onDone({
        kind: "paper",
        order,
        copy,
        reason: settings.paperMode ? "Paper mode is on — nothing was signed." : "Not signed in — nothing was signed.",
      });
      return;
    }
    try {
      const result = await executeCopy(preflight.plan, preflight.params, session.sender!, (step, state) => setProgress({ step, state }));
      await recordCopy();
      add({
        id: result.orderTx,
        market: order.market,
        pair: order.pair,
        base: order.base,
        isBuy: order.isBuy,
        price: preflight.plan.price,
        size: preflight.plan.size,
        filledSize: result.filledSize,
        orderId: result.orderId?.toString() ?? null,
        shadowing: order.trader,
        guardPct: settings.driftGuard ? settings.driftGuardPct : null,
        status: result.restingSize > 0 ? "open" : "filled",
      });
      onDone({ kind: "live", order, copy, result, price: preflight.plan.price, size: preflight.plan.size });
    } catch (e) {
      setProgress(null);
      const msg = e instanceof Error ? e.message : String(e);
      // The order is always the last step, so any failure means no order exists.
      // (An earlier approve/deposit may have succeeded; those funds stay
      // usable in your Kuru balance.)
      setExecError(
        e instanceof CopyStepError && msg === "UNCONFIRMED"
          ? `${STEP_NAMES[e.step.kind]} was sent but hasn't confirmed yet (tx ${e.hash?.slice(0, 10)}…). It may still go through — check your Book before retrying.`
          : e instanceof CopyStepError
            ? `${STEP_NAMES[e.step.kind]} didn't go through: ${/reject|denied|cancel/i.test(msg) ? "you cancelled the signature" : msg.slice(0, 140)}. No order was placed.`
            : `${msg.slice(0, 160)} No order was placed.`,
      );
    }
  };

  const buttonLabel = busy
    ? `${STEP_NAMES[progress!.step.kind]}: ${progress!.state === "signing" ? "sign in your wallet…" : "confirming…"}`
    : checking
      ? "Checking…"
      : blocked
        ? "Can't copy — see above"
        : live
          ? "Confirm & sign on Kuru"
          : "Paper copy (not signed)";

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={busy ? () => {} : onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={busy ? undefined : onClose}>
          <LinearGradient colors={[t.scrim2, t.scrim1]} style={{ flex: 1 }} />
        </Pressable>

        {order && copy && (
          <View
            style={{
              maxHeight: "92%", backgroundColor: t.panel, borderTopLeftRadius: 34, borderTopRightRadius: 34,
              borderTopWidth: 1, borderColor: "rgba(131,110,249,.3)",
            }}
          >
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: insets.bottom + 28 }}>
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
                  <Mono style={{ fontSize: 12.5, color: t.ink3 }}>{fmtSize(order.size)} {order.base}</Mono>
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
                      disabled={busy}
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
                    <Mono style={{ fontSize: 31, fontFamily: fonts.monoSemibold, marginTop: 7, letterSpacing: -0.6 }}>{fmtSize(copy.size)}</Mono>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Mono style={{ fontSize: 11.5, color: t.ink2, lineHeight: 22 }}>{order.base}</Mono>
                    <Mono style={{ fontSize: 11.5, color: t.ink2, lineHeight: 22 }}>≈ {fmtAmount(copy.quoteValue)} USDC</Mono>
                  </View>
                </View>
                {(copy.capped || copy.belowMin) && (
                  <Mono style={{ marginTop: 10, fontSize: 10, letterSpacing: 0.5, color: copy.belowMin ? t.berryInk : t.ink4 }}>
                    {copy.belowMin ? `BELOW KURU MINIMUM OF ${fmtSize(order.minSize)} ${order.base}` : "CAPPED AT YOUR MAX ORDER SIZE"}
                  </Mono>
                )}
              </LinearGradient>

              <View style={{ gap: 9, marginTop: 16 }}>
                {[
                  [
                    "YOUR ORDER",
                    `${order.isBuy ? "BUY" : "SELL"} LIMIT @ ${fmtPrice(preflight?.plan.price ?? order.price)}`,
                    order.isBuy ? t.grn : t.berryInk,
                  ],
                  ["DRIFT GUARD", settings.driftGuard ? `${settings.driftGuardPct}%` : "OFF", settings.driftGuard ? t.ink : t.ink4],
                  ["SIGNED BY", session.address ? `YOUR WALLET · ${shortAddr(session.address)}` : "YOUR WALLET (SIGN IN)", t.ink],
                ].map(([k, v, c]) => (
                  <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Mono style={{ fontSize: 11, color: t.ink4 }}>{k}</Mono>
                    <Mono style={{ fontSize: 11, color: c, flexShrink: 1, textAlign: "right" }}>{v}</Mono>
                  </View>
                ))}
              </View>

              {/* Pre-flight: what will be signed, and anything that blocks it. */}
              {!copy.belowMin && (
                <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: t.a09, backgroundColor: t.card, padding: 14, gap: 8 }}>
                  <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5 }}>CHECKS</Mono>
                  {checking && <Mono style={{ fontSize: 11, color: t.ink4 }}>Checking with Kuru…</Mono>}
                  {error && <Mono style={{ fontSize: 11, lineHeight: 17, color: t.berryInk }}>{`Couldn't check this copy: ${error.slice(0, 120)}`}</Mono>}
                  {preflight?.problems.map((p) => (
                    <Mono key={p} style={{ fontSize: 11, lineHeight: 17, color: t.berryInk }}>{`✗ ${p}`}</Mono>
                  ))}
                  {preflight && preflight.dry.ok && (
                    <Mono style={{ fontSize: 11, color: t.grn }}>✓ ORDER VALIDATED BY THE KURU CONTRACT</Mono>
                  )}
                  {preflight && live &&
                    preflight.plan.steps.map((s, i) => {
                      const state = progress?.step === s ? progress.state : null;
                      return (
                        <Mono key={s.kind} style={{ fontSize: 11, lineHeight: 17, color: state === "done" ? t.grn : t.ink2 }}>
                          {`${state === "done" ? "✓" : `${i + 1}.`} ${s.label}`}
                        </Mono>
                      );
                    })}
                  {preflight && !live && (
                    <Mono style={{ fontSize: 10.5, lineHeight: 16, color: t.ink5 }}>
                      {settings.paperMode ? "PAPER MODE IS ON — NOTHING WILL BE SIGNED." : "NOT SIGNED IN — THIS WILL BE A PAPER COPY."}
                    </Mono>
                  )}
                </View>
              )}

              {execError && (
                <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(160,5,93,.4)", backgroundColor: "rgba(160,5,93,.1)", padding: 12 }}>
                  <T style={{ fontSize: 13, lineHeight: 19, color: t.berryInk2 }}>{execError}</T>
                </View>
              )}

              <Pressable
                disabled={blocked || busy}
                onPress={confirm}
                style={({ pressed }) => ({
                  marginTop: 18, height: 60, borderRadius: 17, alignItems: "center", justifyContent: "center",
                  backgroundColor: pressed ? t.purpHov : t.purp, opacity: blocked && !busy ? 0.5 : 1,
                })}
              >
                <T style={{ fontSize: busy ? 15 : 17, fontFamily: fonts.semibold, color: t.inv }}>{buttonLabel}</T>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}
