import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PulseDot } from "@/components/pulse-dot";
import { Avatar, Chip, DataBadge, Mono, T } from "@/components/ui";
import { SettingsButton, ShadowPlate } from "@/components/visuals";
import { useFollows } from "@/lib/follows";
import { fmtCompactUsd, fmtSignedUsd, shortAddr } from "@/lib/format";
import { windowAvailable, WINDOWS, type Window } from "@/lib/kuru/leaderboard";
import { useLeaderboard } from "@/lib/kuru/use-leaderboard";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const WINDOW_TEXT: Record<Window, { since: string; per: string }> = {
  "1H": { since: "IN THE LAST HOUR", per: "1h" },
  "24H": { since: "IN THE LAST 24H", per: "24h" },
  "7D": { since: "IN THE LAST 7D", per: "7d" },
};

// "SINCE 14:00 UTC OCT 1": bucketed windows start on an hour/day boundary.
const sinceLabel = (ms: number) => {
  const d = new Date(ms);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  return `SINCE ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC ${month} ${d.getUTCDate()}`;
};

// Design screen 02. Until Nansen scoring is wired this is the build plan's
// honest fallback — "Top PnL (beta)" from real Kuru fills — never presented
// as Nansen smart money.
export default function SmartMoney() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [win, setWin] = useState<Window>("1H");
  const { data: board, error, loading, refresh } = useLeaderboard(win);
  // While a newly picked window loads, don't show the previous one's ranks.
  const data = board?.window === win ? board : null;
  const { isFollowing } = useFollows();
  const [note, setNote] = useState<string | null>(null);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.inv }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={refresh} tintColor={t.purp} colors={[t.purp]} />}
    >
      <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Smart money</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
              <Mono style={{ fontSize: 11, letterSpacing: 0.9, color: t.ink5 }}>TOP PNL (BETA) · KURU</Mono>
              <PulseDot color={error ? t.berryInk : t.grn} active={!!data && !error} duration={2200} />
              <Mono style={{ fontSize: 11, letterSpacing: 0.9, color: t.ink5 }}>{error ? "OFFLINE" : "LIVE"}</Mono>
            </View>
          </View>
          <SettingsButton />
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
          {WINDOWS.map((w) => {
            const active = w === win;
            const available = windowAvailable(w);
            return (
              <Pressable
                key={w}
                onPress={() => {
                  if (available) {
                    setWin(w);
                    setNote(null);
                  } else {
                    setNote(`${w} rankings need the Envio indexer, which isn't connected in this build. Showing the last hour.`);
                  }
                }}
                style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: active ? t.purp : "transparent", borderWidth: active ? 0 : 1, borderColor: t.a15,
                  opacity: active || available ? 1 : 0.6,
                }}
              >
                <Mono style={{ fontSize: 11.5, color: active ? t.inv : t.ink3, fontFamily: active ? fonts.monoSemibold : fonts.mono }}>{w}</Mono>
              </Pressable>
            );
          })}
        </View>
        {note && <Mono style={{ marginTop: 10, fontSize: 10.5, lineHeight: 16, color: t.ink4 }}>{note}</Mono>}
      </View>

      <DataBadge label="ESTIMATED PNL FROM ON-CHAIN FILLS · NANSEN NOT WIRED YET" />

      {data && (
        <Mono style={{ marginHorizontal: 22, marginBottom: 14, fontSize: 10.5, lineHeight: 16, color: t.ink6 }}>
          {`${data.fillsSeen.toLocaleString("en-US")} FILLS${data.window === "1H" ? ` ${WINDOW_TEXT[win].since}` : ""} · ${data.botsExcluded} BOTS EXCLUDED · MARKED AT ${data.mid.toFixed(5)}`}
          {data.window === "1H" ? "" : `
${sinceLabel(data.since)} · ENVIO INDEXER`}
        </Mono>
      )}

      {error && !data && (
        <View style={{ marginHorizontal: 22, marginBottom: 14, gap: 10 }}>
          <Mono style={{ fontSize: 11, lineHeight: 17, color: t.berryInk }}>{`Couldn't load rankings: ${error.slice(0, 120)}`}</Mono>
          <Pressable onPress={refresh} style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: t.a15 }}>
            <Mono style={{ fontSize: 11, color: t.ink2 }}>RETRY</Mono>
          </Pressable>
        </View>
      )}

      {!data && loading && (
        <View style={{ paddingHorizontal: 22, gap: 12 }}>
          <Mono style={{ fontSize: 11.5, color: t.ink5, marginBottom: 4 }}>{`Ranking Kuru traders ${WINDOW_TEXT[win].since.toLowerCase()}…`}</Mono>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ height: 70, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, opacity: 0.6 - i * 0.12 }} />
          ))}
        </View>
      )}

      {data && data.traders.length === 0 && (
        <Mono style={{ textAlign: "center", paddingVertical: 32, fontSize: 11.5, color: t.ink5 }}>{`No active traders ${WINDOW_TEXT[win].since.toLowerCase()}.`}</Mono>
      )}

      <View style={{ paddingHorizontal: 22, gap: 12 }}>
        {data?.traders.slice(0, 25).map((r) => (
          <Pressable key={r.address} onPress={() => router.push({ pathname: "/trader/[handle]", params: { handle: r.address, window: win } })}>
            {({ pressed }) => (
              <ShadowPlate>
                <View
                  style={{
                    borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: pressed ? "rgba(131,110,249,.4)" : t.a09,
                    paddingVertical: 15, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14,
                  }}
                >
                  <Mono style={{ fontSize: 13, color: t.ink6, width: 18 }}>{String(r.rank).padStart(2, "0")}</Mono>
                  <Avatar size={38} radius={11} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Mono numberOfLines={1} style={{ fontSize: 14, fontFamily: fonts.monoSemibold, flexShrink: 1 }}>{shortAddr(r.address)}</Mono>
                      {isFollowing(r.address) ? (
                        <Chip label="FOLLOWING" bg={t.purpTint18} color={t.purpInk} />
                      ) : (
                        <Chip label="TOP PNL" bg={t.a10} color={t.ink4} />
                      )}
                    </View>
                    <Mono numberOfLines={1} style={{ fontSize: 11, color: t.ink5, marginTop: 5 }}>{r.fills} fills / {WINDOW_TEXT[win].per}</Mono>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Mono style={{ fontSize: 15, fontFamily: fonts.monoSemibold, color: r.pnlQuote >= 0 ? t.grn : t.berryInk }}>{fmtSignedUsd(r.pnlQuote)}</Mono>
                    <Mono style={{ fontSize: 10.5, color: t.ink5, marginTop: 4 }}>VOL {fmtCompactUsd(r.volumeQuote)}</Mono>
                  </View>
                </View>
              </ShadowPlate>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
