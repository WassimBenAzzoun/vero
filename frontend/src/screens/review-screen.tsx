import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useLocale } from "../lib/locale";
import type { Review } from "../lib/reviews";
import { Notice, Page, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
import { Comments } from "../components/comments";
export function ReviewScreen({
  id,
  initialReview,
}: {
  id: string;
  initialReview?: Review | null;
}) {
  const { t } = useLocale();
  const [review, setReview] = useState<Review | null>(initialReview || null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    let active = true;
    void api<Review>(`/reviews/${id}`)
      .then((row) => {
        if (active) {
          setReview(row);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : t.network);
      });
    return () => {
      active = false;
    };
  }, [id, t.network]);
  useFocusEffect(load);
  return (
    <Page>
      <Notice error text={error} />
      {review ? (
        <>
          <ReviewCard
            review={review}
            detail
            onDeleted={() => router.replace("/my-reviews")}
          />
          {review.status === "PUBLISHED" && (
            <Comments
              id={id}
              onChange={() =>
                void api<Review>(`/reviews/${id}`)
                  .then(setReview)
                  .catch(() => {})
              }
            />
          )}
        </>
      ) : (
        !error && <Notice text={t.loading} />
      )}
      <TextAction title={t.back} onPress={() => router.push("/")} />
    </Page>
  );
}
