import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Vero",
  slug: "vero",
  extra: { eas: { projectId: "7052daca-cac9-47e6-b927-f9642ff71d2c" } },
  scheme: "vero",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: { supportsTablet: true, bundleIdentifier: "com.vero.app" },
  android: {
    package: "com.vero.app",
    versionCode: 2,
    softwareKeyboardLayoutMode: "resize",
  },
  web: { bundler: "metro", output: "server", name: "Vero" },
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
