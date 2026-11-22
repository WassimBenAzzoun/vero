import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import type { Review } from "../lib/reviews";
import { Button, Notice, Page, T, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
import { Comments } from "../components/comments";
import { colors } from "../theme";
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
  const [menuOpen, setMenuOpen] = useState(false);
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
  const canManage =
    review && user?.id === review.author.id && review.status !== "DELETED";
  const remove = async () => {
    if (!canManage || busy) return;
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
          <ReviewCard
            review={review}
            detail
            headerAction={
              canManage && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.reviewOptions}
                  accessibilityState={{ expanded: menuOpen, disabled: busy }}
                  disabled={busy}
                  onPress={() => {
                    setMenuOpen(!menuOpen);
                    setConfirm(false);
                  }}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 22,
                    backgroundColor:
                      pressed || menuOpen ? colors.line : "transparent",
                  })}
                >
                  <T style={{ fontSize: 24, lineHeight: 28 }}>⋮</T>
                </Pressable>
              )
            }
            headerPanel={
              canManage &&
              menuOpen && (
                <View
                  style={{
                    alignSelf: "flex-end",
                    width: 230,
                    maxWidth: "100%",
                    paddingHorizontal: 14,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 12,
                    backgroundColor: colors.white,
                  }}
                >
                  {confirm ? (
                    <>
                      <Button
                        title={t.confirmDelete}
                        busy={busy}
                        onPress={() => void remove()}
                      />
                      <TextAction
                        title={t.cancel}
                        onPress={() => {
                          if (!busy) {
                            setConfirm(false);
                            setMenuOpen(false);
                          }
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <TextAction
                        title={t.edit}
                        onPress={() => {
                          setMenuOpen(false);
                          router.push({
                            pathname: "/reviews/[id]/edit",
                            params: { id },
                          });
                        }}
                      />
                      <TextAction
                        title={t.deleteReview}
                        onPress={() => setConfirm(true)}
                      />
                    </>
                  )}
                </View>
              )
            }
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
