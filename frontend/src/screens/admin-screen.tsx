import { useCallback, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import { colors, fonts } from "../theme";
import { Button, Field, Notice, Page, T, TextAction } from "../components/ui";
type Kind =
  "reports" | "reviews" | "comments" | "shops" | "members" | "history";
type Row = {
  id: string;
  createdAt: string;
  status?: string;
  text?: string;
  name?: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
  reason?: string;
  details?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  shopId?: string;
  reviewId?: string;
  commentId?: string;
  review?: { id: string; text: string; status: string };
  comment?: { id: string; text: string; status: string };
  shop?: { id: string; name: string; status: string };
  links?: { originalUrl: string }[];
  description?: string;
  previousState?: unknown;
  newState?: unknown;
};
type Result = { items: Row[]; nextCursor: string | null };
export function AdminScreen() {
  const { user, ready } = useAuth(),
    { t, language } = useLocale(),
    { width } = useWindowDimensions();
  const [kind, setKind] = useState<Kind>("reports"),
    [openOnly, setOpenOnly] = useState(true),
    [data, setData] = useState<Result | null>(null),
    [selected, setSelected] = useState<Row | null>(null),
    [reason, setReason] = useState(""),
    [name, setName] = useState(""),
    [links, setLinks] = useState(""),
    [target, setTarget] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (cursor?: string) => {
      setBusy(true);
      try {
        const page = await api<Result>(
          `/admin/${kind}?${kind === "reports" && openOnly ? "status=OPEN&" : ""}${cursor ? `cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        setData((old) =>
          cursor && old
            ? { ...page, items: [...old.items, ...page.items] }
            : page,
        );
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t.network);
      } finally {
        setBusy(false);
      }
    },
    [kind, openOnly, t.network],
  );
  useFocusEffect(
    useCallback(() => {
      if (ready && user?.role === "ADMIN" && Platform.OS === "web") void load();
    }, [load, ready, user?.role]),
  );
  if (!ready)
    return (
      <Page>
        <Notice text={t.loading} />
      </Page>
    );
  if (Platform.OS !== "web" || user?.role !== "ADMIN")
    return (
      <Page>
        <Notice
          text={
            language === "ar"
              ? "خاصّ بالإدارة على الويب."
              : "Accès réservé à l’administration sur le web."
          }
        />
        <TextAction
          title={t.profile}
          onPress={() => router.replace("/profile")}
        />
      </Page>
    );
  const choose = (row: Row) => {
    setSelected(row);
    setReason("");
    setName(row.name || "");
    setLinks(row.links?.map((l) => l.originalUrl).join("\n") || "");
    setTarget("");
  };
  const run = async (work: () => Promise<unknown>) => {
    if (reason.trim().length < 3) return setError(t.reason);
    setBusy(true);
    try {
      await work();
      setSelected(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  const action = (
    action: string,
    subjectKind: Kind = kind,
    id = selected?.id,
  ) =>
    void run(() =>
      post(`/admin/${subjectKind}/${id}/actions`, { action, reason }),
    );
  const tabs: [Kind, string][] = [
    ["reports", t.reports],
    ["reviews", t.allReviews],
    ["comments", t.comments],
    ["shops", t.shops],
    ["members", t.users],
    ["history", language === "ar" ? "السجلّ" : "Historique"],
  ];
  const targetKind = selected?.reviewId
    ? "reviews"
    : selected?.commentId
      ? "comments"
      : "shops";
  const targetId =
    selected?.reviewId || selected?.commentId || selected?.shopId;
  return (
    <Page title={t.adminTitle} subtitle={t.adminSubtitle} wide nav={false}>
      <View style={{ flexDirection: width > 900 ? "row" : "column", gap: 24 }}>
        <View style={{ width: width > 900 ? 175 : undefined, gap: 8 }}>
          {tabs.map(([key, label]) => (
            <Button
              key={key}
              title={label}
              secondary={kind !== key}
              onPress={() => {
                setKind(key);
                setSelected(null);
                setData(null);
              }}
            />
          ))}
          <TextAction title={t.back} onPress={() => router.push("/profile")} />
        </View>
        <View style={{ flex: 1, gap: 18 }}>
          {kind === "reports" && (
            <Button
              secondary
              title={
                openOnly
                  ? language === "ar"
                    ? "المفتوحة"
                    : "Signalements ouverts"
                  : language === "ar"
                    ? "الكلّ"
                    : "Tous les signalements"
              }
              onPress={() => {
                setOpenOnly(!openOnly);
                setData(null);
              }}
            />
          )}
          <Notice error text={error} />
          {!!error && (
            <TextAction title={t.retry} onPress={() => void load()} />
          )}
          <View
            style={{
              flexDirection: width > 1100 ? "row" : "column",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                flex: 1,
                width: "100%",
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: 18,
              }}
            >
              {data?.items.map((row) => (
                <View
                  key={row.id}
                  style={{
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                    paddingVertical: 14,
                    gap: 6,
                  }}
                >
                  <TextAction
                    title={
                      row.name ||
                      row.fullName ||
                      row.shop?.name ||
                      row.text?.slice(0, 90) ||
                      row.review?.text?.slice(0, 90) ||
                      row.comment?.text?.slice(0, 90) ||
                      row.action ||
                      row.reason ||
                      row.id
                    }
                    onPress={() => choose(row)}
                  />
                  <T style={{ fontSize: 12, color: colors.muted }}>
                    {new Date(row.createdAt).toLocaleString(
                      language === "ar" ? "ar-TN" : "fr-TN",
                    )}{" "}
                    ·{" "}
                    {row.status ||
                      (row.isActive === undefined
                        ? ""
                        : row.isActive
                          ? "ACTIVE"
                          : "SUSPENDED")}
                  </T>
                </View>
              ))}
              {!data && <Notice text={t.loading} />}
              {data && !data.items.length && <Notice text={t.noItems} />}
              {data?.nextCursor && (
                <TextAction
                  title={t.next}
                  onPress={() => void load(data.nextCursor!)}
                />
              )}
            </View>
            {selected && (
              <View
                style={{
                  flex: 1,
                  width: "100%",
                  backgroundColor: colors.white,
                  borderRadius: 16,
                  padding: 22,
                  gap: 16,
                }}
              >
                <T style={{ fontSize: 23, fontFamily: fonts.heading }}>
                  {selected.name || selected.fullName || t.report}
                </T>
                <T selectable>
                  {selected.text ||
                    selected.review?.text ||
                    selected.comment?.text ||
                    selected.details ||
                    selected.email ||
                    ""}
                </T>
                <T selectable style={{ fontSize: 12 }}>
                  {selected.id} · {selected.status} {selected.reason}
                </T>
                {kind === "history" ? (
                  <>
                    <T selectable>
                      {JSON.stringify(selected.previousState, null, 2)}
                    </T>
                    <T selectable>
                      {JSON.stringify(selected.newState, null, 2)}
                    </T>
                  </>
                ) : (
                  <>
                    <Field
                      label={t.reason}
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      maxLength={1000}
                    />
                    {kind === "reports" ? (
                      <>
                        {targetId && (
                          <View style={{ gap: 10 }}>
                            <T>
                              {language === "ar"
                                ? "المحتوى المبلّغ عنه"
                                : "Contenu signalé"}
                            </T>
                            <Button
                              title={t.hide}
                              secondary
                              busy={busy}
                              onPress={() =>
                                action("hide", targetKind, targetId)
                              }
                            />
                            <Button
                              title={t.restore}
                              secondary
                              busy={busy}
                              onPress={() =>
                                action("restore", targetKind, targetId)
                              }
                            />
                          </View>
                        )}
                        <Button
                          title={t.resolve}
                          busy={busy}
                          onPress={() => action("resolve")}
                        />
                        <Button
                          title={t.dismiss}
                          secondary
                          busy={busy}
                          onPress={() => action("dismiss")}
                        />
                      </>
                    ) : kind === "members" ? (
                      <>
                        <Button
                          title={selected.isActive ? t.suspend : t.reactivate}
                          busy={busy}
                          onPress={() =>
                            action(selected.isActive ? "suspend" : "reactivate")
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title={
                            selected.status === "HIDDEN" ? t.restore : t.hide
                          }
                          busy={busy}
                          onPress={() =>
                            action(
                              selected.status === "HIDDEN" ? "restore" : "hide",
                            )
                          }
                        />
                        {kind === "shops" && selected.status !== "MERGED" && (
                          <>
                            <Field
                              label={t.shopName}
                              value={name}
                              onChangeText={setName}
                              maxLength={150}
                            />
                            <Field
                              label={
                                language === "ar"
                                  ? "الروابط (رابط في كلّ سطر)"
                                  : "Liens (un par ligne)"
                              }
                              value={links}
                              onChangeText={setLinks}
                              multiline
                            />
                            <Button
                              title={t.save}
                              secondary
                              busy={busy}
                              onPress={() =>
                                void run(() =>
                                  api(`/admin/shops/${selected.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      name,
                                      links: links
                                        .split("\n")
                                        .map((l) => l.trim())
                                        .filter(Boolean),
                                      reason,
                                    }),
                                  }),
                                )
                              }
                            />
                            <Field
                              label={t.targetShop}
                              value={target}
                              onChangeText={setTarget}
                            />
                            <Button
                              title={t.merge}
                              secondary
                              busy={busy}
                              onPress={() =>
                                void run(() =>
                                  post(`/admin/shops/${selected.id}/merge`, {
                                    targetId: target,
                                    reason,
                                  }),
                                )
                              }
                            />
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
                <TextAction title={t.close} onPress={() => setSelected(null)} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}
