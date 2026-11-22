import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { Button, Field, Notice, Page, T, TextAction } from "../components/ui";
import { GoogleButton } from "../components/google-button";
import { useAuth } from "../lib/auth";
import { ApiError, post } from "../lib/api";
import { useLocale } from "../lib/locale";
import { colors } from "../theme";
type Mode = "login" | "register" | "forgot" | "reset";
export function AuthScreen({ mode }: { mode: Mode }) {
  const auth = useAuth();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const destination =
    [
      "/reviews/new",
      "/shops/new",
      "/profile",
      "/",
      "/search",
      "/my-reviews",
    ].includes(params.returnTo || "") ||
    /^\/reviews\/[a-f\d-]{36}$/i.test(params.returnTo || "")
      ? params.returnTo!
      : "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (mode !== "reset") return;
    const read = (url: string | null) => {
      const fragment = url?.split("#")[1] || "";
      setToken(new URLSearchParams(fragment).get("token") || "");
    };
    if (process.env.EXPO_OS === "web") read(window.location.href);
    else void Linking.getInitialURL().then(read);
  }, [mode]);
  const failed = (value: unknown) =>
    setError(
      value instanceof ApiError && value.code === "ACCOUNT_LINK_REQUIRED"
        ? t.linkRequired
        : value instanceof ApiError
          ? value.message
          : value instanceof Error && value.message === t.googleCanceled
            ? t.googleCanceled
            : t.network,
    );
  const submit = async () => {
    setError("");
    setNotice("");
    if (mode !== "reset" && !email.trim()) return setError(t.required);
    if (mode === "register" && name.trim().length < 2)
      return setError(t.required);
    if (mode !== "forgot" && !password) return setError(t.required);
    if (
      (mode === "register" || mode === "reset") &&
      !/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(password)
    )
      return setError(t.passwordRule);
    if ((mode === "register" || mode === "reset") && password !== confirm)
      return setError(t.mismatch);
    setBusy(true);
    try {
      if (mode === "login") await auth.signIn(email.trim(), password);
      if (mode === "register")
        await auth.register(email.trim(), password, name.trim());
      if (mode === "forgot") {
        await post("/auth/forgot-password", { email: email.trim() });
        setNotice(t.checkEmail);
      } else if (mode === "reset") {
        if (!token) throw new Error(t.resetInvalid);
        await post("/auth/reset-password", { token, password });
        setToken("");
        setPassword("");
        setConfirm("");
        setNotice(t.passwordUpdated);
      } else router.replace(destination as "/profile");
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  };
  const google = async (idToken: string) => {
    setBusy(true);
    setError("");
    try {
      await auth.google(idToken);
      router.replace(destination as "/profile");
    } catch (value) {
      failed(value);
    } finally {
      setBusy(false);
    }
  };
  const titles = {
    login: [t.loginTitle, t.loginSubtitle],
    register: [t.registerTitle, t.registerSubtitle],
    forgot: [t.forgotTitle, t.forgotSubtitle],
    reset: [t.resetTitle, t.resetSubtitle],
  };
  return (
    <Page title={titles[mode][0]} subtitle={titles[mode][1]} nav={false}>
      {mode === "register" && (
        <Field
          label={t.name}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          testID="auth-name"
          maxLength={100}
        />
      )}
      {mode !== "reset" && (
        <Field
          label={t.email}
          placeholder="Ex. : vous@exemple.tn"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          testID="auth-email"
        />
      )}
      {mode !== "forgot" && (
        <Field
          label={mode === "reset" ? t.newPassword : t.password}
          password
          value={password}
          onChangeText={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          maxLength={128}
          testID="auth-password"
        />
      )}
      {(mode === "register" || mode === "reset") && (
        <>
          <Field
            label={t.confirmPassword}
            password
            value={confirm}
            onChangeText={setConfirm}
            maxLength={128}
            testID="auth-confirm"
          />
          <Notice text={t.passwordRule} />
        </>
      )}
      {mode === "login" && (
        <View style={{ alignSelf: "flex-end", marginTop: -12 }}>
          <TextAction
            title={t.forgot}
            onPress={() => router.push("/forgot-password")}
          />
        </View>
      )}
      <Notice error text={error} />
      <Notice text={notice} />
      <Button
        title={
          mode === "login"
            ? t.login
            : mode === "register"
              ? t.register
              : mode === "forgot"
                ? t.sendReset
                : t.reset
        }
        busy={busy}
        disabled={mode === "forgot" && !auth.config.recoveryEnabled}
        onPress={() => void submit()}
        testID="auth-submit"
      />
      {mode === "forgot" && !auth.config.recoveryEnabled && (
        <Notice text={t.recoveryDisabled} />
      )}
      {(mode === "login" || mode === "register") && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{ height: 1, backgroundColor: colors.line, flex: 1 }}
            />
            <T>{t.or}</T>
            <View
              style={{ height: 1, backgroundColor: colors.line, flex: 1 }}
            />
          </View>
          <GoogleButton
            enabled={auth.config.googleEnabled}
            clientId={auth.config.googleWebClientId}
            onToken={google}
            onError={failed}
            busy={busy}
          />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 4,
              alignItems: "center",
            }}
          >
            <T>{mode === "login" ? t.noAccount : t.hasAccount}</T>
            <TextAction
              title={mode === "login" ? t.register : t.login}
              onPress={() =>
                router.replace({
                  pathname: mode === "login" ? "/register" : "/login",
                  params: { returnTo: destination },
                })
              }
            />
          </View>
        </>
      )}
      <TextAction title={t.back} onPress={() => router.replace("/")} />
    </Page>
  );
}
