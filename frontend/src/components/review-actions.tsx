import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import { sharePath } from "../lib/share";
import type { Review } from "../lib/reviews";
import { Notice, TextAction } from "./ui";
export function ReviewActions({ review }: { review: Review }) {
  const { user } = useAuth(),
    { t, language } = useLocale();
  const [state, setState] = useState({
      liked: review.liked,
      likeCount: review.likeCount,
    }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const like = async () => {
    if (!user)
      return router.push({
        pathname: "/login",
        params: { returnTo: `/reviews/${review.id}` },
      });
    setBusy(true);
    setMessage("");
    try {
      setState(
        await api(`/reviews/${review.id}/like`, {
          method: state.liked ? "DELETE" : "PUT",
        }),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <TextAction
          title={`${state.liked ? "♥" : "♡"} ${state.likeCount}`}
          onPress={() => {
            if (!busy) void like();
          }}
        />
        <TextAction
          title={`${t.comments} (${review.commentCount})`}
          onPress={() =>
            router.push({
              pathname: "/reviews/[id]",
              params: { id: review.id },
            })
          }
        />
        <TextAction
          title={t.share}
          onPress={() =>
            void sharePath(`/reviews/${review.id}`)
              .then(() =>
                setMessage(
                  language === "ar" ? "الرابط جاهز" : "Lien partagé ou copié.",
                ),
              )
              .catch(() => setMessage(t.network))
          }
        />
      </View>
      <Notice text={message} />
    </View>
  );
}
