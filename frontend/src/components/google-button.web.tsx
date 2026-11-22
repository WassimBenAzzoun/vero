import { useEffect, useRef, useState, type ComponentRef } from "react";
import { View } from "react-native";
import { Button, Notice } from "./ui";
import { useLocale } from "../lib/locale";
import type { GoogleProps } from "./google-button";
type GoogleAPI = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (value: { credential: string }) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          type: string;
          theme: string;
          size: string;
          width: number;
          locale: string;
        },
      ) => void;
    };
  };
};
export function GoogleButton({
  enabled,
  clientId,
  onToken,
  onError,
  busy,
}: GoogleProps) {
  const { t, language } = useLocale();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({ onToken, onError });
  useEffect(() => {
    callbacks.current = { onToken, onError };
  }, [onToken, onError]);
  useEffect(() => {
    if (!enabled || !clientId) return;
    let mounted = true;
    const render = () => {
      const google = (window as Window & { google?: GoogleAPI }).google;
      if (!mounted || !google || !ref.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          void callbacks.current
            .onToken(credential)
            .catch(callbacks.current.onError);
        },
      });
      google.accounts.id.renderButton(ref.current as unknown as HTMLElement, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 330,
        locale: language,
      });
    };
    let script = document.getElementById(
      "vero-google-gis",
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "vero-google-gis";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    const fail = () => {
      if (mounted) setFailed(true);
    };
    script.addEventListener("error", fail);
    render();
    return () => {
      mounted = false;
      script.removeEventListener("load", render);
      script.removeEventListener("error", fail);
    };
  }, [enabled, clientId, language]);
  return enabled && clientId && !failed ? (
    <View
      ref={ref}
      style={{ minHeight: 48, alignItems: "center", opacity: busy ? 0.5 : 1 }}
    />
  ) : (
    <>
      <Button
        title={t.google}
        disabled
        secondary
        onPress={() => {}}
        testID="google-sign-in"
      />
      <Notice text={failed ? t.network : t.googleDisabled} />
    </>
  );
}
