import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CopySheet, type CopyOutcome, type CopySource } from "@/components/copy-sheet";
import { PulseDot } from "@/components/pulse-dot";
import { ReadyModal } from "@/components/ready-modal";
import { Avatar, Chip, DataBadge, Mono, SideChip, T } from "@/components/ui";
import { SettingsButton } from "@/components/visuals";
import { useFollows } from "@/lib/follows";
import { fmtAge, fmtPrice, fmtSize, shortAddr } from "@/lib/format";
import type { LiveTrade } from "@/lib/kuru/live-trades";
import { MARKETS } from "@/lib/kuru/markets";
import { useLeaderboard } from "@/lib/kuru/use-leaderboard";
import { useLiveTrades } from "@/lib/kuru/use-live-trades";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const MAX_ROWS = 40;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Design screen 04, adapted to how Kuru is actually used: humans trade by
// taking liquidity, so the feed shows followed traders' fills, and Copy places
// the user's own limit order at the trader's price.
export default function Feed() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { trades, headBlock, status, error } = useLiveTrades();
  const { follows } = useFollows();
  const { data: board } = useLeaderboard();
  const now = useNow();
  const [scope, setScope] = useState<"following" | "all" | null>(null);
  const [copying, setCopying] = useState<CopySource | null>(null);
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);

  // Default to Following once the user follows anyone.
  const active = scope ?? (follows.size > 0 ? "following" : "all");
  const rows = (active === "following" ? trades.filter((x) => follows.has(x.trader.toLowerCase())) : trades).slice(0, MAX_ROWS);
  const rankOf = (a: string) => board?.traders.find((x) => x.address.toLowerCase() === a.toLowerCase())?.rank;
  const isErr = status === "error";

  const labelFor = (a: string) => {
    const rank = rankOf(a);
    return rank ? `#${rank} TOP PNL` : "UNRANKED";
  };

  const toCopySource = (x: LiveTrade): CopySource => ({
    market: x.market,
    trader: x.trader,
    who: shortAddr(x.trader),
    label: labelFor(x.trader),
    isBuy: x.isBuy,
    pair: x.pair,
    base: x.base,
    size: x.size,
    price: x.price,
    age: fmtAge(now - x.at),
    minSize: x.minSize,
  });

  const chip = (value: "following" | "all", label: string) => {
    const on = active === value;
    return (
      <Pressable
        onPress={() => setScope(value)}
        style={{
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
          backgroundColor: on ? t.purp : "transparent", borderWidth: on ? 0 : 1, borderColor: t.a15,
        }}
      >
        <Mono style={{ fontSize: 11.5, color: on ? t.inv : t.ink3, fontFamily: on ? fonts.monoSemibold : fonts.mono }}>{label}</Mono>
      </Pressable>
    );
  };

  const header = (
    <View>
      <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1 }}>Feed</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 999, borderWidth: 1, borderColor: isErr ? "rgba(240,140,190,.4)" : t.g30,
              }}
            >
              <PulseDot color={isErr ? t.berryInk : t.grn} active={status === "live"} />
              <Mono style={{ fontSize: 10.5, color: isErr ? t.berryInk : t.grn }}>
                {headBlock ? `BLOCK ${headBlock.toLocaleString("en-US")}` : isErr ? "OFFLINE" : "CONNECTING"}
              </Mono>
            </View>
            <SettingsButton />
          </View>
        </View>
        <Mono style={{ fontSize: 11.5, color: t.ink5, marginTop: 9 }}>
          {follows.size} shadows followed · {MARKETS.map((m) => m.base).join(" · ")} on Kuru
        </Mono>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {chip("following", `FOLLOWING · ${follows.size}`)}
          {chip("all", "ALL TRADERS")}
        </View>
      </View>
      <DataBadge label="LIVE KURU MAINNET · RANKS ARE TOP PNL (BETA), NOT NANSEN" />
      {isErr && (
        <Mono style={{ marginHorizontal: 22, marginBottom: 12, fontSize: 11, color: t.berryInk }}>
          {`Can't reach Monad RPC — retrying. ${error?.slice(0, 80) ?? ""}`}
        </Mono>
      )}
    </View>
  );

  const empty =
    isErr ? null : active === "following" && follows.size === 0 ? (
      <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 32, gap: 14 }}>
        <T style={{ fontSize: 14, lineHeight: 21, color: t.ink3, textAlign: "center" }}>
          {"You're not shadowing anyone yet. Pick traders from the Smart money board and tap Follow."}
        </T>
        <Pressable onPress={() => router.navigate("/smart")} style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: "rgba(131,110,249,.5)" }}>
          <Mono style={{ fontSize: 11, color: t.purp }}>OPEN SMART MONEY</Mono>
        </Pressable>
      </View>
    ) : (
      <Mono style={{ textAlign: "center", paddingVertical: 40, paddingHorizontal: 28, fontSize: 11.5, lineHeight: 18, color: t.ink5 }}>
        {status !== "live"
          ? "Reading Kuru trades…"
          : active === "following"
            ? "No trades from the wallets you follow in the last few minutes. New ones appear here live."
            : "No trades in the last few minutes."}
      </Mono>
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.inv, paddingTop: insets.top }}>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.key}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={empty}
        renderItem={({ item: x }) => (
          <View style={{ marginHorizontal: 22, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable
                onPress={() => router.push({ pathname: "/trader/[handle]", params: { handle: x.trader } })}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}
              >
                <Avatar />
                <Mono style={{ fontSize: 13, fontFamily: fonts.monoSemibold }}>{shortAddr(x.trader)}</Mono>
                <Chip label={labelFor(x.trader)} bg={rankOf(x.trader) ? t.purpTint18 : t.a10} color={rankOf(x.trader) ? t.purpInk : t.ink4} />
              </Pressable>
              <Mono style={{ fontSize: 10.5, color: t.ink6 }}>{fmtAge(now - x.at)}</Mono>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 15 }}>
              <View style={{ flexShrink: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <SideChip isBuy={x.isBuy} text={x.isBuy ? "BOUGHT" : "SOLD"} />
                  <T style={{ fontSize: 17, fontFamily: fonts.semibold, letterSpacing: -0.35 }}>{x.pair}</T>
                </View>
                <Mono style={{ fontSize: 12.5, color: t.ink3, marginTop: 9 }}>
                  {fmtSize(x.size)} {x.base} @ {fmtPrice(x.price)}
                </Mono>
              </View>
              <Pressable
                onPress={() => setCopying(toCopySource(x))}
                style={({ pressed }) => ({ height: 40, paddingHorizontal: 20, borderRadius: 12, justifyContent: "center", backgroundColor: pressed ? t.purpHov : t.purp })}
              >
                <T style={{ fontSize: 14.5, fontFamily: fonts.semibold, color: t.inv }}>Copy</T>
              </Pressable>
            </View>
          </View>
        )}
      />

      <CopySheet
        key={copying ? `${copying.who}:${copying.price}:${copying.size}` : "closed"}
        order={copying}
        onClose={() => setCopying(null)}
        onDone={(o) => {
          setCopying(null);
          setOutcome(o);
        }}
      />
      <ReadyModal outcome={outcome} onClose={() => setOutcome(null)} />
    </View>
  );
}
