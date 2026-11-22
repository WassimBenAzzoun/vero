import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useLocale } from "../lib/locale";
import type { ReviewPage } from "../lib/reviews";
import { Button, Notice, Page, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
import { useAuth } from '../lib/auth';
export function FeedScreen({
  initialData,
}: { initialData?: ReviewPage | null } = {}) {
  const { t } = useLocale();
  const {user}=useAuth();
  const version=useRef(0);
  const lastViewer=useRef(user?.id);
  const [sort, setSort] = useState<"latest" | "trending">("latest");
  const [data, setData] = useState<ReviewPage | null>(initialData || null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (cursor?: string) => {
      const current=++version.current;
      setBusy(true);
      setError("");
      try {
        const page = await api<ReviewPage>(
          `/feed?sort=${sort}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        if(current===version.current)setData((old) =>
          cursor && old
            ? { ...page, items: [...old.items, ...page.items] }
            : page,
        );
      } catch (e) {
        if(current===version.current)setError(e instanceof Error ? e.message : t.network);
      } finally {
        if(current===version.current)setBusy(false);
      }
    },
    [sort, t.network],
  );
  useFocusEffect(
    useCallback(() => {
      if(lastViewer.current!==user?.id){lastViewer.current=user?.id;setData(null);}
      void load();
      return ()=>{version.current++;};
    }, [load,user?.id]),
  );
  return (
    <Page title={t.feedTitle} subtitle={t.feedSubtitle}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(["latest", "trending"] as const).map((value) => (
          <View key={value} style={{ flex: 1 }}>
            <Button
              title={t[value]}
              secondary={sort !== value}
              onPress={() => {if(value!==sort){setData(null);setSort(value);}}}
            />
          </View>
        ))}
      </View>
      <Notice error text={error} />
      {!!error && <TextAction title={t.retry} onPress={() => void load()} />}
      {busy && !data && <Notice text={t.loading} />}
      {data?.items.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onDeleted={(id) =>
            setData((page) => page && { ...page, items: page.items.filter((item) => item.id !== id) })
          }
        />
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
