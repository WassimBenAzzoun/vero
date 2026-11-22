import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Button, Field, Notice, Page, T } from "../components/ui";
import { api } from "../lib/api";
import { useDraft } from "../lib/draft";
import { useLocale } from "../lib/locale";
import type { Shop, ShopPage } from "../lib/shops";
import { colors, fonts } from "../theme";
export function SearchScreen() {
  const { draft, update, ready } = useDraft();
  const { t, rtl } = useLocale();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const [items, setItems] = useState<Shop[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const search = useCallback(
    async (q: string, cursor?: string) => {
      const request = ++sequence.current;
      setBusy(true);
      setError("");
      try {
        const result = await api<ShopPage>(
          `/shops?q=${encodeURIComponent(q)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        if (request !== sequence.current) return;
        setItems((before) =>
          cursor ? [...before, ...result.items] : result.items,
        );
        setNext(result.nextCursor);
      } catch (value) {
        if (request === sequence.current)
          setError(value instanceof Error ? value.message : t.network);
      } finally {
        if (request === sequence.current) setBusy(false);
      }
    },
    [t.network],
  );
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void search(draft.query), 250);
    return () => clearTimeout(timer);
  }, [ready, draft.query, search]);
  const add = () => {
    const q = draft.query.trim();
    const link = /^(https?:|www\.|[^\s/]+\.[a-z]{2,}(?:\/|$))/i.test(q);
    update({ pendingName: link ? "" : q, pendingLink: link ? q : "" });
    router.push("/shops/new");
  };
  const choose = (shop: Shop) => {
    if (review === "1") {
      update({ shopId: shop.id, shopName: shop.name });
      router.push("/reviews/new");
    } else router.push({ pathname: "/shops/[id]", params: { id: shop.id } });
  };
  return (
    <Page title={t.searchTitle} subtitle={t.searchSubtitle}>
      <Field
        label={t.searchHint}
        hideLabel
        placeholder={t.searchHint}
        value={draft.query}
        onChangeText={(query) => {
          sequence.current++;
          update({ query });
        }}
        maxLength={500}
        autoCapitalize="none"
        onSubmitEditing={() => void search(draft.query)}
        returnKeyType="search"
        testID="shop-query"
      />
      <Button
        title={t.search}
        busy={busy}
        onPress={() => void search(draft.query)}
        testID="shop-search"
      />
      <T
        style={{
          fontFamily: rtl ? fonts.arabic : fonts.heading,
          fontSize: 21,
          marginTop: 8,
        }}
      >
        {t.results}
      </T>
      {error ? (
        <>
          <Notice error text={error} />
          <Button
            secondary
            title={t.retry}
            onPress={() => void search(draft.query)}
          />
        </>
      ) : busy && !items.length ? (
        <ActivityIndicator color={colors.ink} />
      ) : !items.length ? (
        <View style={{ gap: 6 }}>
          <T>{t.noResults}</T>
          <Notice text={t.noResultsHelp} />
        </View>
      ) : (
        <View>
          {items.map((shop) => (
            <Pressable
              key={shop.id}
              accessibilityRole="button"
              accessibilityLabel={shop.name}
              onPress={() => choose(shop)}
              style={{
                borderTopWidth: 1,
                borderColor: colors.line,
                paddingVertical: 19,
                flexDirection: "row",
                alignItems: "center",
                gap: 15,
              }}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <T
                  style={{
                    fontFamily: rtl ? fonts.arabic : fonts.heading,
                    fontSize: 20,
                  }}
                >
                  {shop.name}
                </T>
                <T style={{ color: colors.muted }}>
                  {shop.links
                    .map((link) =>
                      link.handle ? `@${link.handle}` : t.website,
                    )
                    .join(" · ")}
                </T>
                <T>
                  {shop.averageRating === null
                    ? t.noReviews
                    : `★ ${shop.averageRating.toFixed(1)} · ${shop.reviewCount} ${t.reviews}`}
                </T>
              </View>
              <Svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                style={{ transform: [{ scaleX: rtl ? -1 : 1 }] }}
              >
                <Path
                  d="M9 5L16 12L9 19"
                  stroke={colors.ink}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ))}
        </View>
      )}
      {next && !error && (
        <Button
          secondary
          title={t.next}
          busy={busy}
          onPress={() => void search(draft.query, next)}
        />
      )}
      <View style={{ marginTop: 24 }}>
        <Button
          title={`+ ${t.addShop}`}
          secondary
          onPress={add}
          testID="add-shop"
        />
      </View>
    </Page>
  );
}
