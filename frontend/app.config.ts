import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Vero",
  slug: "vero",
  scheme: "vero",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: { supportsTablet: true, bundleIdentifier: "com.vero.app" },
  android: { package: "com.vero.app", softwareKeyboardLayoutMode: "resize" },
  web: { bundler: "metro", output: "single", name: "Vero" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],
};
export default config;
