import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import type { ReviewPage } from "../lib/reviews";
import { useLocale } from "../lib/locale";
import { Button, Notice, Page, T } from "../components/ui";
import { ReviewCard } from "../components/review-card";
export function MyReviews() {
  const { t } = useLocale();
  const [data, setData] = useState<ReviewPage | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void api<ReviewPage>("/my/reviews")
        .then((value) => {
          if (active) setData(value);
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : t.network);
        });
      return () => {
        active = false;
      };
    }, [t.network]),
  );
  const more = async () => {
    try {
      const next = await api<ReviewPage>(
        `/my/reviews?cursor=${encodeURIComponent(data!.nextCursor!)}`,
      );
      setData((before) => ({
        items: [...(before?.items || []), ...next.items],
        nextCursor: next.nextCursor,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    }
  };
  return (
    <Page title={t.myReviews}>
      <Notice error text={error} />
      {!data && !error && <Notice text={t.loading} />}
      {data && !data.items.length && <T>{t.noItems}</T>}
      {data?.items.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {data?.nextCursor && (
        <Button title={t.next} onPress={() => void more()} />
      )}
    </Page>
  );
}
