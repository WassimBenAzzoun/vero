import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { api, clearSession, post, signOut } from "../lib/api";
import { useDraft } from "../lib/draft";
import { useLocale } from "../lib/locale";
import { Button, Field, Notice, Page, T, TextAction } from "../components/ui";
import { GoogleButton } from "../components/google-button";
export function ProfileScreen() {
  const { user, config, ready } = useAuth();
  const { clear } = useDraft();
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  if (!ready)
    return (
      <Page>
        <Notice text={t.loading} />
      </Page>
    );
  if (!user)
    return (
      <Page title={t.account}>
        <Button
          title={t.login}
          onPress={() =>
            router.push({
              pathname: "/login",
              params: { returnTo: "/profile" },
            })
          }
        />
        <TextAction
          title={t.register}
          onPress={() => router.push("/register")}
        />
      </Page>
    );
  const deleted = async (idToken?: string) => {
    await api("/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ currentPassword: password || undefined, idToken }),
    });
    await clearSession();
    await clear();
    router.replace("/");
  };
  return (
    <Page title={user.fullName} subtitle={user.email}>
      <Notice text={message} />
      <TextAction
        title={t.myReviews}
        onPress={() => router.push("/my-reviews")}
      />
      <Field
        label={t.currentPassword}
        password
        value={password}
        onChangeText={setPassword}
        maxLength={128}
      />
      <Field
        label={t.newPassword}
        password
        value={next}
        onChangeText={setNext}
        maxLength={128}
      />
      <Button
        secondary
        title={t.changePassword}
        busy={busy}
        onPress={() =>
          void run(async () => {
            await api("/auth/me/password", {
              method: "PATCH",
              body: JSON.stringify({
                currentPassword: password,
                newPassword: next,
              }),
            });
            await clearSession();
            router.replace("/login");
          })
        }
      />
      {config.googleEnabled && (
        <>
          <T>{t.linkGoogle}</T>
          <GoogleButton
            enabled
            clientId={config.googleWebClientId}
            onToken={async (idToken) => {
              await run(async () => {
                await post("/auth/google/link", {
                  idToken,
                  currentPassword: password,
                });
                setMessage(t.saved);
              });
            }}
            onError={(error) =>
              setMessage(error instanceof Error ? error.message : t.network)
            }
          />
        </>
      )}
      <Button
        title={t.signOut}
        busy={busy}
        onPress={() =>
          void run(async () => {
            await signOut();
            await clear();
            router.replace("/");
          })
        }
      />
      <View style={{ marginTop: 28 }}>
        <TextAction title={t.deleteAccount} onPress={() => setDeleting(true)} />
      </View>
      {deleting && (
        <>
          <T>{t.deleteExplain}</T>
          <Button
            secondary
            title={t.confirmDelete}
            busy={busy}
            onPress={() => void run(() => deleted())}
          />
          {config.googleEnabled && (
            <GoogleButton
              enabled
              clientId={config.googleWebClientId}
              onToken={async (token) => {
                await run(() => deleted(token));
              }}
              onError={(error) =>
                setMessage(error instanceof Error ? error.message : t.network)
              }
            />
          )}
          <TextAction title={t.cancel} onPress={() => setDeleting(false)} />
        </>
      )}
    </Page>
  );
}
