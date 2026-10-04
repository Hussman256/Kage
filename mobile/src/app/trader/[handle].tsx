import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";
import { Avatar, DataBadge, Mono, SideChip, T } from "@/components/ui";
import { GhostButton, PrimaryButton } from "@/components/visuals";
import { useFollows } from "@/lib/follows";
import { fmtAge, fmtCompactUsd, fmtPrice, fmtSignedUsd, fmtSize, shortAddr } from "@/lib/format";
import { getTrader, WINDOWS, type Leaderboard, type TraderStats, type Window } from "@/lib/kuru/leaderboard";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const WINDOW_TEXT: Record<Window, string> = { "1H": "LAST HOUR", "24H": "LAST 24H", "7D": "LAST 7D" };

// Map a PnL series into the design's 300×74 equity-curve box.
function curvePoints(values: number[]) {
  if (values.length < 2) return "0,37 300,37";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => `${((i / (values.length - 1)) * 300).toFixed(1)},${(66 - ((v - min) / span) * 58).toFixed(1)}`)
    .join(" ");
}

// Design screen 03 — the evidence trail behind a ranking. Real fills from the
// leaderboard window it was opened from; Nansen label history arrives with the
// Nansen integration.
export default function TraderDetail() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ handle: string; window?: string }>();
  const handle = params.handle;
  const window: Window = WINDOWS.find((w) => w === params.window) ?? "1H";
  const [state, setState] = useState<{ board: Leaderboard; trader: TraderStats | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isFollowing, toggle } = useFollows();
  const following = isFollowing(handle);

  useEffect(() => {
    getTrader(handle, window).then(setState, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [handle, window]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/smart"));
  const trader = state?.trader;

  const stats = trader
    ? [
        { label: `${window} PNL`, value: fmtSignedUsd(trader.pnlQuote), color: trader.pnlQuote >= 0 ? t.grn : t.berryInk },
        { label: "FILLS", value: String(trader.fills), color: t.ink },
        { label: "VOLUME", value: fmtCompactUsd(trader.volumeQuote), color: t.ink },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.inv }}>
      <LinearGradient
        // Vertical so the whole bottom edge reaches transparent (a diagonal
        // axis left one corner tinted, which showed as a hard edge).
        colors={["rgba(131,110,249,.26)", "rgba(131,110,249,.10)", t.invT]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340 + insets.top }}
      />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 22, paddingBottom: 130 }}>
        <Pressable onPress={back} hitSlop={12} style={{ alignSelf: "flex-start" }}>
          <Mono style={{ fontSize: 12, color: t.ink3 }}>← SMART MONEY</Mono>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 22 }}>
          <View style={{ borderRadius: 19, borderWidth: 1, borderColor: t.a14 }}>
            <Avatar size={66} radius={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Mono numberOfLines={1} style={{ fontSize: 22, fontFamily: fonts.monoSemibold, letterSpacing: -0.5 }}>{shortAddr(handle)}</Mono>
            <Mono selectable numberOfLines={1} style={{ fontSize: 10.5, color: t.ink4, marginTop: 6 }}>{handle}</Mono>
          </View>
        </View>

        {trader && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 18 }}>
            <Mono style={{ fontSize: 10, letterSpacing: 0.5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, overflow: "hidden", backgroundColor: t.a10, color: t.ink3 }}>
              {`#${trader.rank} TOP PNL (BETA)`}
            </Mono>
            {trader.nansenLabel && (
              <Mono style={{ fontSize: 10, letterSpacing: 0.5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, overflow: "hidden", backgroundColor: t.purpTint18, color: t.purpInk }}>
                {`NANSEN · ${trader.nansenLabel.toUpperCase()}`}
              </Mono>
            )}
            {trader.positions.map((p) => (
              <Mono
                key={p.market.address}
                style={{
                  fontSize: 10, letterSpacing: 0.5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, overflow: "hidden",
                  backgroundColor: p.netBase >= 0 ? "rgba(131,110,249,.2)" : "rgba(160,5,93,.22)",
                  color: p.netBase >= 0 ? t.purpInk : t.berryInk,
                }}
              >
                {`NET ${p.netBase >= 0 ? "LONG" : "SHORT"} ${fmtSize(Math.abs(p.netBase))} ${p.market.base}`}
              </Mono>
            ))}
          </View>
        )}

        <View style={{ marginTop: 16, marginHorizontal: -20 }}>
          <DataBadge label={`${WINDOW_TEXT[window]} OF KURU FILLS · ${state?.board.nansen.live ? "LABELS FROM NANSEN" : "NANSEN LABELS NOT WIRED YET"}`} />
        </View>

        {error && <Mono style={{ fontSize: 11, lineHeight: 17, color: t.berryInk }}>{`Couldn't load this trader: ${error.slice(0, 120)}`}</Mono>}
        {!state && !error && <Mono style={{ fontSize: 11.5, color: t.ink5 }}>Loading fills…</Mono>}
        {state && !trader && (
          <T style={{ fontSize: 14, lineHeight: 21, color: t.ink3 }}>{`This wallet has no qualifying Kuru fills in the ${WINDOW_TEXT[window].toLowerCase()}.`}</T>
        )}

        {trader && (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              {stats.map((s) => (
                <View key={s.label} style={{ flex: 1, borderRadius: 15, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 14 }}>
                  <Mono style={{ fontSize: 9.5, letterSpacing: 0.8, color: t.ink5 }}>{s.label}</Mono>
                  <Mono adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 20, fontFamily: fonts.monoSemibold, marginTop: 8, color: s.color }}>{s.value}</Mono>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: t.panel, borderWidth: 1, borderColor: t.a08, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5 }}>{`ESTIMATED PNL · ${WINDOW_TEXT[window]}`}</Mono>
                <Mono style={{ fontSize: 10, color: trader.pnlQuote >= 0 ? t.grn : t.berryInk }}>{fmtSignedUsd(trader.pnlQuote)}</Mono>
              </View>
              <Svg width="100%" height={74} viewBox="0 0 300 74" preserveAspectRatio="none" style={{ marginTop: 12 }}>
                <Polyline points={curvePoints(trader.curve)} fill="none" stroke={t.purp} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>

            {trader.positions.length > 1 && (
              <View style={{ marginTop: 18 }}>
                <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5, marginBottom: 12 }}>BY MARKET</Mono>
                <View style={{ gap: 9 }}>
                  {trader.positions.map((p) => (
                    <View key={p.market.address} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Mono style={{ flex: 1, fontSize: 12, color: t.ink2 }}>{p.market.pair}</Mono>
                      <Mono style={{ fontSize: 11, color: t.ink5 }}>{`${p.fills} fills`}</Mono>
                      <Mono style={{ width: 96, textAlign: "right", fontSize: 12, color: p.pnlQuote >= 0 ? t.grn : t.berryInk }}>{fmtSignedUsd(p.pnlQuote)}</Mono>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ marginTop: 18 }}>
              <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5, marginBottom: 12 }}>RECENT FILLS</Mono>
              <View style={{ gap: 11 }}>
                {trader.recent.map((f, i) => (
                  // One tx can hold several fills at the same price and size, so the
                  // position keeps keys unique within this fixed list.
                  <View key={`${f.txHash}:${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Mono style={{ fontSize: 10.5, color: t.ink6, width: 34 }}>
                      {fmtAge(state!.board.fetchedAt - f.at)}
                    </Mono>
                    <SideChip isBuy={f.isBuy} text={f.isBuy ? "BUY" : "SELL"} />
                    <Mono style={{ flex: 1, fontSize: 12, color: t.ink2 }} numberOfLines={1}>
                      {fmtSize(f.size)} {f.market.base} @ {fmtPrice(f.price)}
                    </Mono>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <LinearGradient
        colors={[t.invT, t.inv, t.inv]}
        locations={[0, 0.38, 1]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
      >
        {following ? (
          <GhostButton label="Following shadow ✓" onPress={() => toggle(handle)} />
        ) : (
          <PrimaryButton label="Follow shadow" onPress={() => toggle(handle)} />
        )}
      </LinearGradient>
    </View>
  );
}
