import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import type { Review } from "../lib/reviews";
import { Button, Notice, Page, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
import { Comments } from "../components/comments";
export function ReviewScreen({
  id,
  initialReview,
}: {
  id: string;
  initialReview?: Review | null;
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [review, setReview] = useState<Review | null>(initialReview || null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/reviews/${id}`, { method: "DELETE" });
      router.replace("/my-reviews");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Notice error text={error} />
      {review ? (
        <>
          <ReviewCard review={review} detail />
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
          {user?.id === review.author.id && review.status !== "DELETED" && (
            <>
              <TextAction
                title={t.edit}
                onPress={() =>
                  router.push({
                    pathname: "/reviews/[id]/edit",
                    params: { id },
                  })
                }
              />
              <TextAction
                title={t.deleteReview}
                onPress={() => setConfirm(true)}
              />
              {confirm && (
                <>
                  <Button
                    title={t.confirmDelete}
                    busy={busy}
                    onPress={() => void remove()}
                  />
                  <TextAction
                    title={t.cancel}
                    onPress={() => setConfirm(false)}
                  />
                </>
              )}
            </>
          )}
        </>
      ) : (
        !error && <Notice text={t.loading} />
      )}
      <TextAction title={t.back} onPress={() => router.push("/")} />
    </Page>
  );
}
