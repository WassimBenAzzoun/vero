import Constants from "expo-constants";
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
  const configured =
    enabled &&
    !!clientId &&
    Constants.executionEnvironment !== "storeClient" &&
    (process.env.EXPO_OS !== "ios" ||
      !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const signIn = async () => {
    try {
      const { GoogleSignin, isSuccessResponse } =
        await import("@react-native-google-signin/google-signin");
      GoogleSignin.configure({
        webClientId: clientId!,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result) || !result.data.idToken)
        throw new Error(t.googleCanceled);
      await onToken(result.data.idToken);
    } catch (error) {
      onError(error);
    }
  };
  return (
    <>
      <Button
        title={t.google}
        disabled={!configured}
        busy={busy}
        secondary
        onPress={() => void signIn()}
        testID="google-sign-in"
      />
      {!configured && <Notice text={t.googleDisabled} />}
    </>
  );
}
