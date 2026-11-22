import { useEffect, useState } from "react";
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
  const [action, setAction] = useState<"password" | "link" | "delete" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [security, setSecurity] = useState<{
    hasPassword: boolean;
    googleLinked: boolean;
  } | null>(null);
  useEffect(() => {
    if (!ready || !user) return;
    let active = true;
    void api<{ hasPassword: boolean; googleLinked: boolean }>(
      "/auth/me/security",
    )
      .then((value) => {
        if (active) setSecurity(value);
      })
      .catch((error) => {
        if (active)
          setMessage(error instanceof Error ? error.message : t.network);
      });
    return () => {
      active = false;
    };
  }, [ready, user, t.network]);
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
  const chooseAction = (value: typeof action) => {
    setPassword("");
    setNext("");
    setMessage("");
    setAction(value);
  };
  const canLink =
    security?.hasPassword && !security.googleLinked && config.googleEnabled;
  return (
    <Page title={user.fullName} subtitle={user.email}>
      <Notice text={message} />
      <TextAction
        title={t.myReviews}
        onPress={() => router.push("/my-reviews")}
      />
      {!security && <Notice text={t.loading} />}
      {security?.hasPassword && action !== "password" && (
        <TextAction
          title={t.changePassword}
          onPress={() => chooseAction("password")}
        />
      )}
      {action === "delete" && <T>{t.deleteExplain}</T>}
      {security?.hasPassword && action && (
        <Field
          label={t.currentPassword}
          password
          value={password}
          onChangeText={setPassword}
          maxLength={128}
        />
      )}
      {security?.hasPassword && action === "password" && (
        <>
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
        </>
      )}
      {security?.googleLinked && <Notice text={t.googleConnected} />}
      {canLink && action !== "link" && (
        <TextAction title={t.linkGoogle} onPress={() => chooseAction("link")} />
      )}
      {canLink && action === "link" && (
        <>
          <GoogleButton
            enabled
            clientId={config.googleWebClientId}
            onToken={async (idToken) => {
              await run(async () => {
                await post("/auth/google/link", {
                  idToken,
                  currentPassword: password,
                });
                chooseAction(null);
                setMessage(t.saved);
                setSecurity({ hasPassword: true, googleLinked: true });
              });
            }}
            onError={(error) =>
              setMessage(error instanceof Error ? error.message : t.network)
            }
          />
        </>
      )}
      {user.role === "ADMIN" && process.env.EXPO_OS === "web" && (
        <Button
          title={t.admin}
          secondary
          onPress={() => router.push("/admin")}
        />
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
      {action !== "delete" && (
        <View style={{ marginTop: 28 }}>
          <TextAction
            title={t.deleteAccount}
            onPress={() => chooseAction("delete")}
          />
        </View>
      )}
      {action === "delete" && (
        <>
          {security?.hasPassword && (
            <Button
              secondary
              title={t.confirmDelete}
              busy={busy}
              onPress={() => void run(() => deleted())}
            />
          )}
          {security?.googleLinked &&
            !security.hasPassword &&
            config.googleEnabled && (
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
        </>
      )}
      {action && (
        <TextAction title={t.cancel} onPress={() => chooseAction(null)} />
      )}
    </Page>
  );
}
