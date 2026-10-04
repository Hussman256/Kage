import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Address } from "viem";
import { DataBadge, Mono, SideChip, T } from "@/components/ui";
import { SettingsButton } from "@/components/visuals";
import { useSession } from "@/lib/auth";
import { useCopies, type CopyRecord } from "@/lib/copies";
import { fmtAge, fmtPrice, fmtSize, fmtSignedUsd, shortAddr } from "@/lib/format";
import { driftPct } from "@/lib/kuru/guards";
import { getBestBidAsk } from "@/lib/kuru/orderbook";
import { cancelCopies, isExpired, readCopyStatus, type CopyStatus } from "@/lib/kuru/positions";
import { useSettings } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

const REFRESH_MS = 10_000;
type Tab = "open" | "filled" | "cancelled";

// Design screen 07, on the user's real copies (ledger in lib/copies + live
// order state from Kuru). Stale copies are flagged for a one-tap cancel —
// Kage never signs in the background.
export default function Book() {
  const { t, settings } = useSettings();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { copies, update } = useCopies();
  const [tab, setTab] = useState<Tab>("open");
  const [status, setStatus] = useState<Map<string, CopyStatus>>(new Map());
  const [book, setBook] = useState<Map<string, { bid: number | null; ask: number | null }>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null); // copy id, or "all"
  const [error, setError] = useState<string | null>(null);

  const open = copies.filter((c) => c.status === "open");

  // Poll Kuru for fills on open copies and the mid for drift/PnL.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [st, ...books] = await Promise.all([
          readCopyStatus(copies.filter((c) => c.status === "open")),
          ...Array.from(new Set(copies.map((c) => c.market))).map(async (m) => [m, await getBestBidAsk(m as Address)] as const),
        ]);
        if (!alive) return;
        setStatus(st);
        setBook(new Map(books as (readonly [string, { bid: number | null; ask: number | null }])[]));
        setNow(Date.now());
        for (const [id, s] of st) if (s.closed) update(id, { status: "filled", filledSize: s.filled });
      } catch {
        // Transient RPC errors: keep the last known state, retry next tick.
      }
    };
    void tick();
    const id = setInterval(tick, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [copies, update]);

  const mid = (market: string) => {
    const b = book.get(market);
    return b?.bid != null && b?.ask != null ? (b.bid + b.ask) / 2 : null;
  };
  const filledOf = (c: CopyRecord) => status.get(c.id)?.filled ?? c.filledSize;

  // Estimated PnL of what actually filled, marked at the current mid.
  const pnl = useMemo(() => {
    let total = 0;
    for (const c of copies) {
      const m = mid(c.market);
      const f = filledOf(c);
      if (m === null || f <= 0) continue;
      total += (c.isBuy ? m - c.price : c.price - m) * f;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copies, status, book]);

  const staleReason = (c: CopyRecord): string | null => {
    if (c.status !== "open") return null;
    if (settings.autoCancel && isExpired(c, now)) return "EXPIRED";
    const b = book.get(c.market);
    if (settings.driftGuard && b) {
      const d = driftPct(c.isBuy, c.price, b);
      if (d !== null && d > (c.guardPct ?? settings.driftGuardPct)) return `PRICE MOVED ${d.toFixed(1)}%`;
    }
    return null;
  };

  const cancel = async (list: CopyRecord[], key: string) => {
    if (!session.sender || !list.length) return;
    setBusy(key);
    setError(null);
    try {
      const ids = await cancelCopies(list, session.sender);
      for (const id of ids) update(id, { status: "cancelled" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancel/i.test(msg) ? "Signature cancelled — nothing changed." : `Cancel failed: ${msg.slice(0, 120)}`);
    } finally {
      setBusy(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "open", label: `Open · ${open.length}` },
    { key: "filled", label: "Filled" },
    { key: "cancelled", label: "Cancelled" },
  ];
  const rows = copies.filter((c) => c.status === tab);
  const staleOpen = open.filter((c) => staleReason(c));

  return (
    <View style={{ flex: 1, backgroundColor: t.inv, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T style={{ fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Your book</T>
            <SettingsButton />
          </View>

          <View style={{ flexDirection: "row", gap: 20, marginTop: 16, borderBottomWidth: 1, borderBottomColor: t.a10 }}>
            {tabs.map((x) => {
              const active = x.key === tab;
              return (
                <Pressable key={x.key} onPress={() => setTab(x.key)} style={{ paddingBottom: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: active ? t.purp : "transparent" }}>
                  <T style={{ fontSize: 14.5, fontFamily: active ? fonts.semibold : fonts.regular, color: active ? t.ink : t.ink5 }}>{x.label}</T>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            {[
              { label: "EST. COPY PNL", value: copies.length ? fmtSignedUsd(pnl) : "—", color: pnl >= 0 ? t.grn : t.berryInk },
              { label: "COPIES", value: String(copies.length), color: t.ink },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, borderRadius: 15, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 15 }}>
                <Mono style={{ fontSize: 9.5, letterSpacing: 0.8, color: t.ink5 }}>{s.label}</Mono>
                <Mono adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 24, fontFamily: fonts.monoSemibold, marginTop: 8, color: s.color }}>{s.value}</Mono>
              </View>
            ))}
          </View>
        </View>

        {!session.authenticated && <DataBadge label="SIGN IN TO PLACE REAL COPIES · PAPER COPIES AREN'T KEPT HERE" />}

        {error && (
          <View style={{ marginHorizontal: 22, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(160,5,93,.4)", backgroundColor: "rgba(160,5,93,.1)", padding: 12 }}>
            <T style={{ fontSize: 13, lineHeight: 19, color: t.berryInk2 }}>{error}</T>
          </View>
        )}

        {tab === "open" && staleOpen.length > 0 && session.sender && (
          <Pressable
            onPress={() => cancel(staleOpen, "stale")}
            disabled={!!busy}
            style={{ marginHorizontal: 22, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,140,190,.4)", padding: 12 }}
          >
            <Mono style={{ fontSize: 11, color: t.berryInk }}>
              {busy === "stale" ? "CANCELLING…" : `${staleOpen.length} STALE ${staleOpen.length === 1 ? "COPY" : "COPIES"} · TAP TO CANCEL`}
            </Mono>
          </Pressable>
        )}

        {rows.length === 0 ? (
          <Mono style={{ textAlign: "center", paddingVertical: 40, paddingHorizontal: 28, fontSize: 11.5, lineHeight: 18, color: t.ink5 }}>
            {tab === "open" ? "No open copies. Copy a trade from the Feed." : tab === "filled" ? "No filled copies yet." : "No cancelled copies."}
          </Mono>
        ) : (
          <View style={{ paddingHorizontal: 22, gap: 11 }}>
            {rows.map((c) => {
              const filled = filledOf(c);
              const pct = c.size > 0 ? Math.min(1, filled / c.size) : 0;
              const stale = staleReason(c);
              return (
                <View key={c.id} style={{ borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: stale ? "rgba(240,140,190,.4)" : t.a09, paddingVertical: 15, paddingHorizontal: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                      <SideChip isBuy={c.isBuy} text={c.isBuy ? "BUY" : "SELL"} />
                      <T style={{ fontSize: 15.5, fontFamily: fonts.semibold, letterSpacing: -0.25 }}>{c.pair}</T>
                    </View>
                    <Mono style={{ fontSize: 10.5, color: stale ? t.berryInk : t.ink5 }}>{stale ?? fmtAge(now - c.createdAt)}</Mono>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                    <Mono style={{ fontSize: 12, color: t.ink3 }}>{fmtSize(c.size)} @ {fmtPrice(c.price)}</Mono>
                    <Mono style={{ fontSize: 12, color: t.ink2 }}>{Math.round(pct * 100)}% filled</Mono>
                  </View>
                  <View style={{ height: 3, borderRadius: 999, backgroundColor: t.a10, marginTop: 11, overflow: "hidden" }}>
                    <View style={{ height: 3, borderRadius: 999, backgroundColor: t.purp, width: `${Math.max(pct, 0.03) * 100}%` }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 }}>
                    <Mono style={{ fontSize: 10, letterSpacing: 0.6, color: t.ink6 }}>
                      {`SHADOWING ${shortAddr(c.shadowing)}${c.guardPct != null ? ` · GUARD ${c.guardPct}%` : ""}`}
                    </Mono>
                    {c.status === "open" && session.sender && (
                      <Pressable onPress={() => cancel([c], c.id)} disabled={!!busy} hitSlop={8}>
                        <Mono style={{ fontSize: 11, color: t.berryInk }}>{busy === c.id ? "CANCELLING…" : "CANCEL"}</Mono>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {open.length > 0 && session.sender && (
        <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: t.a08 }}>
          <Pressable
            onPress={() => cancel(open, "all")}
            disabled={!!busy}
            style={({ pressed }) => ({
              height: 50, borderRadius: 15, borderWidth: 1, borderColor: "rgba(160,5,93,.5)", alignItems: "center", justifyContent: "center",
              backgroundColor: pressed ? "rgba(160,5,93,.26)" : "rgba(160,5,93,.14)",
            })}
          >
            <Mono style={{ fontSize: 12.5, letterSpacing: 1.25, color: t.berryInk }}>{busy === "all" ? "CANCELLING…" : "CANCEL ALL COPIES"}</Mono>
          </Pressable>
        </View>
      )}
    </View>
  );
}
