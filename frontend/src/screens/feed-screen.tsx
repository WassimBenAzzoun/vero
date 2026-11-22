import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useLocale } from "../lib/locale";
import type { ReviewPage } from "../lib/reviews";
import { Button, Notice, Page, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
export function FeedScreen() {
  const { t } = useLocale();
  const [sort, setSort] = useState<"latest" | "trending">("latest");
  const [data, setData] = useState<ReviewPage | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (cursor?: string) => {
      setBusy(true);
      setError("");
      try {
        const page = await api<ReviewPage>(
          `/feed?sort=${sort}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        setData((old) =>
          cursor && old
            ? { ...page, items: [...old.items, ...page.items] }
            : page,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t.network);
      } finally {
        setBusy(false);
      }
    },
    [sort, t.network],
  );
  useFocusEffect(
    useCallback(() => {
      setData(null);
      void load();
    }, [load]),
  );
  return (
    <Page title={t.feedTitle} subtitle={t.feedSubtitle}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(["latest", "trending"] as const).map((value) => (
          <View key={value} style={{ flex: 1 }}>
            <Button
              title={t[value]}
              secondary={sort !== value}
              onPress={() => setSort(value)}
            />
          </View>
        ))}
      </View>
      <Notice error text={error} />
      {!!error && <TextAction title={t.retry} onPress={() => void load()} />}
      {busy && !data && <Notice text={t.loading} />}
      {data?.items.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {data && !data.items.length && <Notice text={t.noReviews} />}
      {data?.nextCursor && (
        <Button
          title={t.next}
          secondary
          busy={busy}
          onPress={() => void load(data.nextCursor!)}
        />
      )}
    </Page>
  );
}
