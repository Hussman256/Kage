import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { BookIcon, FeedIcon, RoomsIcon, SmartIcon } from "@/components/icons";
import { Mono } from "@/components/ui";
import { useTheme } from "@/theme/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TABS = [
  { name: "feed", label: "FEED", Icon: FeedIcon },
  { name: "smart", label: "SMART", Icon: SmartIcon },
  { name: "book", label: "BOOK", Icon: BookIcon },
  { name: "rooms", label: "ROOMS", Icon: RoomsIcon },
] as const;

// The design's bottom nav: mono labels, purple when active, no pill indicator.
function KageTabBar({ state, navigation, insets }: TabBarProps) {
  const { t } = useTheme();
  const active = state.routes[state.index]?.name;
  return (
    <View
      style={{
        flexDirection: "row", justifyContent: "space-around", alignItems: "center",
        paddingTop: 14, paddingBottom: insets.bottom + 14, paddingHorizontal: 18,
        borderTopWidth: 1, borderTopColor: t.a08, backgroundColor: t.navBg,
      }}
    >
      {TABS.map(({ name, label, Icon }) => {
        const color = active === name ? t.purp : t.ink6;
        return (
          <Pressable
            key={name}
            onPress={() => navigation.navigate(name)}
            hitSlop={12}
            style={{ alignItems: "center", gap: 6, minWidth: 56 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === name }}
          >
            <Icon color={color} />
            <Mono style={{ fontSize: 10, color }}>{label}</Mono>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <KageTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.inv } }}
    >
      {TABS.map(({ name }) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
