import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Button, Field, Notice, Page, TextAction } from "../components/ui";
import { useAuth } from "../lib/auth";
import { post } from "../lib/api";
import { useDraft } from "../lib/draft";
import { useLocale } from "../lib/locale";
import type { Shop } from "../lib/shops";
export function AddShopScreen() {
  const { user, ready: authReady } = useAuth();
  const { draft, update, ready } = useDraft();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const extraLinks = draft.pendingExtraLinks ?? [];
  const save = async () => {
    setError("");
    const links = [draft.pendingLink, ...extraLinks.map(({ url }) => url)]
      .map((link) => link.trim())
      .filter(Boolean);
    if (!draft.pendingName.trim() || !links.length) return setError(t.required);
    if (!user) {
      router.push({ pathname: "/login", params: { returnTo: "/shops/new" } });
      return;
    }
    setBusy(true);
    try {
      const result = await post<{ shop: Shop; created: boolean }>("/shops", {
        name: draft.pendingName.trim(),
        links,
      });
      update({
        shopId: result.shop.id,
        shopName: result.shop.name,
        pendingName: "",
        pendingLink: "",
        pendingExtraLinks: [],
      });
      router.replace("/reviews/new");
    } catch (value) {
      setError(value instanceof Error ? value.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  if (!ready || !authReady)
    return (
      <Page>
        <Notice text={t.loading} />
      </Page>
    );
  return (
    <Page title={t.addShopTitle} subtitle={t.addShopSubtitle}>
      <Field
        label={t.shopName}
        placeholder={t.nameHint}
        value={draft.pendingName}
        onChangeText={(pendingName) => update({ pendingName })}
        maxLength={150}
        testID="shop-name"
      />
      <Field
        label={t.shopLink}
        placeholder={t.linkHint}
        value={draft.pendingLink}
        onChangeText={(pendingLink) => update({ pendingLink })}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={2000}
        testID="shop-link"
      />
      {extraLinks.map(({ id, url }) => (
        <View key={id} style={{ gap: 4 }}>
          <Field
            label={t.extraShopLink}
            placeholder={t.linkHint}
            value={url}
            onChangeText={(value) =>
              update({
                pendingExtraLinks: extraLinks.map((link) =>
                  link.id === id ? { ...link, url: value } : link,
                ),
              })
            }
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={2000}
          />
          <TextAction
            title={t.removeShopLink}
            onPress={() =>
              update({
                pendingExtraLinks: extraLinks.filter((link) => link.id !== id),
              })
            }
          />
        </View>
      ))}
      {extraLinks.length < 4 && (
        <Button
          title={`+ ${t.addShopLink}`}
          secondary
          disabled={busy}
          onPress={() =>
            update({
              pendingExtraLinks: [...extraLinks, { id: randomUUID(), url: "" }],
            })
          }
        />
      )}
      <Notice error text={error} />
      <Button
        title={user ? t.continueReview : t.login}
        busy={busy}
        onPress={() => void save()}
        testID="shop-save"
      />
      <TextAction title={t.back} onPress={() => router.navigate("/search")} />
    </Page>
  );
}
