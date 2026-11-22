import { useState } from "react";
import { router } from "expo-router";
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
  const save = async () => {
    setError("");
    if (!draft.pendingName.trim() || !draft.pendingLink.trim())
      return setError(t.required);
    if (!user) {
      router.push({ pathname: "/login", params: { returnTo: "/shops/new" } });
      return;
    }
    setBusy(true);
    try {
      const result = await post<{ shop: Shop; created: boolean }>("/shops", {
        name: draft.pendingName.trim(),
        links: [draft.pendingLink.trim()],
      });
      update({ shopId: result.shop.id, shopName: result.shop.name });
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
      <Notice error text={error} />
      <Button
        title={user ? t.continueReview : t.login}
        busy={busy}
        onPress={() => void save()}
        testID="shop-save"
      />
      <TextAction title={t.back} onPress={() => router.push("/")} />
    </Page>
  );
}
