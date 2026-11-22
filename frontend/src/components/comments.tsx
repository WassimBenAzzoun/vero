import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { api, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import { Button, Field, Notice, T, TextAction } from "./ui";
import { ReportButton } from "./report-button";
type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; fullName: string };
};
type CommentPage = { items: Comment[]; nextCursor: string | null };
export function Comments({
  id,
  onChange,
}: {
  id: string;
  onChange?: () => void;
}) {
  const { user } = useAuth(),
    { t } = useLocale();
  const [data, setData] = useState<CommentPage | null>(null),
    [text, setText] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (cursor?: string) => {
      try {
        const page = await api<CommentPage>(
          `/reviews/${id}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        setData((old) =>
          cursor && old
            ? { ...page, items: [...old.items, ...page.items] }
            : page,
        );
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t.network);
      }
    },
    [id, t.network],
  );
  useEffect(() => {
    let active = true;
    void api<CommentPage>(`/reviews/${id}/comments`)
      .then((page) => {
        if (active) setData(page);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : t.network);
      });
    return () => {
      active = false;
    };
  }, [id, t.network]);
  const submit = async () => {
    if (!user)
      return router.push({
        pathname: "/login",
        params: { returnTo: `/reviews/${id}` },
      });
    if (!text.trim()) return;
    setBusy(true);
    try {
      if (editing)
        await api(`/comments/${editing}`, {
          method: "PATCH",
          body: JSON.stringify({ text }),
        });
      else await post(`/reviews/${id}/comments`, { text });
      setText("");
      setEditing(null);
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (commentId: string) => {
    setBusy(true);
    try {
      await api(`/comments/${commentId}`, { method: "DELETE" });
      await load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 15 }}>
      <T style={{ fontSize: 22 }}>{t.comments}</T>
      <Notice error text={error} />
      <Field
        label={t.writeComment}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
      />
      <Button
        title={editing ? t.save : t.sendComment}
        busy={busy}
        onPress={() => void submit()}
      />
      {editing && (
        <TextAction
          title={t.cancel}
          onPress={() => {
            setEditing(null);
            setText("");
          }}
        />
      )}
      {data?.items.map((comment) => (
        <View
          key={comment.id}
          style={{
            gap: 6,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: "#DAD5CF",
          }}
        >
          <T style={{ fontWeight: "bold" }}>{comment.author.fullName}</T>
          <T>{comment.text}</T>
          <ReportButton targetType="comment" targetId={comment.id} />
          {user?.id === comment.author.id && (
            <View style={{ flexDirection: "row", gap: 20 }}>
              <TextAction
                title={t.edit}
                onPress={() => {
                  setEditing(comment.id);
                  setText(comment.text);
                }}
              />
              <TextAction
                title={t.deleteReview}
                onPress={() => {
                  if (!busy) void remove(comment.id);
                }}
              />
            </View>
          )}
        </View>
      ))}
      {data && !data.items.length && <Notice text={t.noComments} />}
      {data?.nextCursor && (
        <TextAction
          title={t.next}
          onPress={() => void load(data.nextCursor!)}
        />
      )}
    </View>
  );
}
