import Constants from "expo-constants";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KuruFundsSection } from "@/components/kuru-funds";
import { Mono, T } from "@/components/ui";
import { AppearancePicker } from "@/components/visuals";
import { previewReason, useSession } from "@/lib/auth";
import { useSettings } from "@/theme/theme";
import { fonts } from "@/theme/tokens";

// Reached from the gear on every main screen. Not part of the original design
// set; built from its card, label, and segmented-control styles.
export default function Settings() {
  const { t, settings } = useSettings();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/smart"));

  const section = (title: string, children: ReactNode) => (
    <View style={{ marginTop: 22 }}>
      <Mono style={{ fontSize: 10, letterSpacing: 1, color: t.ink5, marginBottom: 12 }}>{title}</Mono>
      <View style={{ borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.a09, padding: 18 }}>{children}</View>
    </View>
  );

  const risk = [
    `Max ${settings.maxOrderQuote} USDC`,
    `${settings.ratio * 100}% ratio`,
    settings.paperMode ? "paper mode" : null,
  ].filter(Boolean).join(" · ");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.inv }} contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 28 }}>
      <Pressable onPress={back} hitSlop={12} style={{ alignSelf: "flex-start" }}>
        <Mono style={{ fontSize: 12, color: t.ink3 }}>← BACK</Mono>
      </Pressable>
      <T style={{ marginTop: 14, fontSize: 30, fontFamily: fonts.semibold, letterSpacing: -1.05 }}>Settings</T>

      {section(
        "APPEARANCE",
        <>
          <AppearancePicker />
          <Mono style={{ fontSize: 10.5, lineHeight: 16, color: t.ink6, marginTop: 12 }}>
            {settings.appearance === "system" ? "MATCHES YOUR PHONE'S DARK / LIGHT SETTING" : `ALWAYS ${settings.appearance.toUpperCase()}`}
          </Mono>
        </>,
      )}

      {section(
        "TRADING",
        <Pressable onPress={() => router.push("/risk")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {({ pressed }) => (
            <>
              <View style={{ flex: 1, opacity: pressed ? 0.6 : 1 }}>
                <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Risk controls</T>
                <Mono style={{ fontSize: 10.5, color: t.ink6, marginTop: 5 }}>{risk.toUpperCase()}</Mono>
              </View>
              <T style={{ fontSize: 20, color: t.ink4 }}>›</T>
            </>
          )}
        </Pressable>,
      )}

      {session.authenticated && section("KURU", <KuruFundsSection />)}

      {section(
        "ACCOUNT",
        session.authenticated ? (
          <View style={{ gap: 14 }}>
            <View>
              <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Your wallet</T>
              <Mono selectable style={{ fontSize: 11.5, color: t.ink3, marginTop: 6 }}>
                {session.address ?? "Creating your wallet…"}
              </Mono>
              <Mono style={{ fontSize: 10.5, color: t.ink6, marginTop: 6 }}>PRIVY EMBEDDED WALLET · SECURED BY YOUR PASSKEY</Mono>
            </View>
            <Pressable
              onPress={async () => {
                await session.logout();
                router.replace("/onboard");
              }}
              style={({ pressed }) => ({
                height: 46, borderRadius: 14, borderWidth: 1, borderColor: "rgba(160,5,93,.5)", alignItems: "center", justifyContent: "center",
                backgroundColor: pressed ? "rgba(160,5,93,.26)" : "rgba(160,5,93,.14)",
              })}
            >
              <Mono style={{ fontSize: 12, letterSpacing: 1.2, color: t.berryInk }}>LOG OUT</Mono>
            </Pressable>
          </View>
        ) : (
          <View>
            <T style={{ fontSize: 14.5, fontFamily: fonts.medium }}>Wallet</T>
            <Mono style={{ fontSize: 10.5, lineHeight: 16, color: t.ink6, marginTop: 5 }}>
              {`NOT SIGNED IN${previewReason ? ` · ${previewReason.toUpperCase()}` : ""}`}
            </Mono>
          </View>
        ),
      )}

      {section(
        "ABOUT",
        <View style={{ gap: 10 }}>
          {[
            ["VERSION", Constants.expoConfig?.version ?? "—"],
            ["NETWORK", "MONAD MAINNET"],
            ["ORDER BOOK", "KURU"],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Mono style={{ fontSize: 11, color: t.ink5 }}>{k}</Mono>
              <Mono style={{ fontSize: 11 }}>{v}</Mono>
            </View>
          ))}
        </View>,
      )}
    </ScrollView>
  );
}
