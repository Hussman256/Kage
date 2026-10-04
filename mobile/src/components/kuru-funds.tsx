import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import type { Address } from "viem";
import { useSession } from "@/lib/auth";
import { fmtAmount, fmtSize } from "@/lib/format";
import { readKuruFunds, withdrawAllFunds, type KuruFunds } from "@/lib/kuru/funds";
import { useTheme } from "@/theme/theme";
import { fonts } from "@/theme/tokens";
import { Mono, T } from "./ui";

// Settings → "Funds on Kuru": what sits in Kuru's margin account and a
// one-tap withdraw back to the wallet.
export function KuruFundsSection() {
  const { t } = useTheme();
  const session = useSession();
  const [funds, setFunds] = useState<KuruFunds | null>(null);
  const [state, setState] = useState<"idle" | "withdrawing">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session.address) return;
    let alive = true;
    readKuruFunds(session.address as Address)
      .then((f) => alive && setFunds(f))
      .catch(() => alive && setMessage("Couldn't read your Kuru balance."));
    return () => {
      alive = false;
    };
  }, [session.address, reloadKey]);

  const withdrawable = funds?.filter((f) => f.amount > 0) ?? [];

  const withdraw = async () => {
    if (!session.sender || !withdrawable.length) return;
    setState("withdrawing");
    setMessage(null);
    try {
      await withdrawAllFunds(session.sender, withdrawable.map((f) => f.token));
      setMessage("Withdrawn to your wallet.");
      setReloadKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(/reject|denied|cancel/i.test(msg) ? "Signature cancelled — nothing moved." : `Withdraw failed: ${msg.slice(0, 100)}`);
    } finally {
      setState("idle");
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Funds on Kuru</T>
      {!funds && !message && <Mono style={{ fontSize: 11, color: t.ink5 }}>Loading…</Mono>}
      {/* USDC and MON always; other markets' tokens only when there's a balance. */}
      {funds?.filter((f) => f.amount > 0 || f.symbol === "USDC" || f.symbol === "MON").map((f) => (
        <View key={f.token} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Mono style={{ fontSize: 12, color: t.ink5 }}>{f.symbol}</Mono>
          <Mono style={{ fontSize: 12 }}>{f.symbol === "USDC" ? fmtAmount(f.amount) : fmtSize(f.amount)}</Mono>
        </View>
      ))}
      <Mono style={{ fontSize: 10.5, lineHeight: 16, color: t.ink6 }}>
        DEPOSITED FOR COPIES AND PROCEEDS OF FILLED COPIES. FUNDS IN OPEN ORDERS STAY LOCKED UNTIL CANCELLED.
      </Mono>
      {message && <Mono style={{ fontSize: 11, lineHeight: 17, color: t.ink3 }}>{message}</Mono>}
      {withdrawable.length > 0 && session.sender && (
        <Pressable
          onPress={withdraw}
          disabled={state !== "idle"}
          style={({ pressed }) => ({
            height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center",
            borderColor: pressed ? "rgba(131,110,249,.6)" : t.a16,
          })}
        >
          <Mono style={{ fontSize: 12, letterSpacing: 1, color: t.ink2 }}>{state === "withdrawing" ? "WITHDRAWING…" : "WITHDRAW ALL TO WALLET"}</Mono>
        </Pressable>
      )}
    </View>
  );
}
