import { Platform, Share } from "react-native";
export async function sharePath(path: string) {
  const origin =
    process.env.EXPO_PUBLIC_WEB_URL ||
    (Platform.OS === "web"
      ? window.location.origin
      : "https://vero-backend.cloudplay.tech");
  const url = origin.replace(/\/$/, "") + path;
  if (Platform.OS === "web") {
    if (navigator.share) await navigator.share({ url });
    else await navigator.clipboard.writeText(url);
  } else await Share.share({ message: url, url });
}
