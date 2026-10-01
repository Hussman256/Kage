import { Geist_300Light, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, useFonts } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_600SemiBold, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { authEnabled, SessionProvider } from "@/lib/auth";
import { FollowsProvider } from "@/lib/follows";
import { ThemeProvider, useTheme } from "@/theme/theme";

SplashScreen.preventAutoHideAsync();

function Root({ fontsReady }: { fontsReady: boolean }) {
  const { t, scheme, loaded } = useTheme();
  const ready = fontsReady && loaded;

  // Keep the native splash up until fonts and saved settings (theme) are in,
  // so the app never flashes the wrong theme.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.inv }, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboard" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trader/[handle]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="risk" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
    // Noto Serif JP subset to the single 影 glyph (2 KB instead of 7.6 MB).
    "KageMark-Bold": require("../../assets/fonts/KageMark-Bold.ttf"),
    "KageMark-Black": require("../../assets/fonts/KageMark-Black.ttf"),
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <AuthProvider>
            <FollowsProvider>
              {/* On a font load failure, fall back to system fonts rather than a blank app. */}
              <Root fontsReady={fontsLoaded || !!fontError} />
            </FollowsProvider>
          </AuthProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Privy is required lazily: its passkey dependency is a native module that
// doesn't exist in Expo Go, so importing it there would crash the app.
const AuthProvider: (props: { children: ReactNode }) => ReactNode = authEnabled
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional load, see above
    require("@/lib/privy").PrivyAuthProvider
  : ({ children }) => children;
