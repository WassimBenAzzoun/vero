import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { LocaleProvider } from "../lib/locale";
import { AuthProvider } from "../lib/auth";
import { DraftProvider } from "../lib/draft";
import { Platform } from "react-native";
export default function Layout() {
  const [loaded, error] = useFonts({
    Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Poppins_700Bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
    NotoSansArabic_400Regular: require("@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf"),
  });
  if (!loaded && !error && Platform.OS !== "web") return null;
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <DraftProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#F6F0E6" },
              }}
            />
          </AuthProvider>
        </DraftProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
