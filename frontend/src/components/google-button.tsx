import Constants from "expo-constants";
import { useRef, useState } from "react";
import { Platform } from "react-native";
import { Button, Notice } from "./ui";
import { useLocale } from "../lib/locale";
export type GoogleProps = {
  enabled: boolean;
  clientId: string | null;
  onToken: (token: string) => Promise<void>;
  onError: (error: unknown) => void;
  busy?: boolean;
};
export function GoogleButton({
  enabled,
  clientId,
  onToken,
  onError,
  busy,
}: GoogleProps) {
  const { t } = useLocale();
  const signingIn = useRef(false);
  const [opening, setOpening] = useState(false);
  const configured =
    enabled &&
    !!clientId &&
    Constants.executionEnvironment !== "storeClient" &&
    (Platform.OS !== "ios" || !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const signIn = async () => {
    if (!configured || busy || signingIn.current) return;
    signingIn.current = true;
    setOpening(true);
    try {
      const { GoogleSignin, isSuccessResponse } =
        await import("@react-native-google-signin/google-signin");
      GoogleSignin.configure({
        webClientId: clientId!,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
      if (Platform.OS === "android")
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return;
      if (!result.data.idToken) throw new Error(t.googleNativeConfig);
      await onToken(result.data.idToken);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code === "10" || code === "DEVELOPER_ERROR")
        onError(new Error(t.googleNativeConfig));
      else if (code === "PLAY_SERVICES_NOT_AVAILABLE")
        onError(new Error(t.googlePlayServices));
      else if (error instanceof Error && error.message === t.googleNativeConfig)
        onError(error);
      else onError(new Error(t.googleNativeFailed));
    } finally {
      signingIn.current = false;
      setOpening(false);
    }
  };
  return (
    <>
      <Button
        title={t.google}
        disabled={!configured}
        busy={busy || opening}
        secondary
        onPress={() => void signIn()}
        testID="google-sign-in"
      />
      {!configured && <Notice text={t.googleDisabled} />}
    </>
  );
}
