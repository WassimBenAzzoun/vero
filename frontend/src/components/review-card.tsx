import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { API, api } from "../lib/api";
import type { Review } from "../lib/reviews";
import { useLocale } from "../lib/locale";
import { colors, fonts } from "../theme";
import { Button, Notice, T, TextAction } from "./ui";
import { ReviewActions } from "./review-actions";
export function ReviewCard({
  review,
  detail = false,
  children,
  onDeleted,
}: {
  review: Review;
  detail?: boolean;
  children?: React.ReactNode;
  onDeleted: (id: string) => void;
}) {
  const { t, language, rtl } = useLocale();
  const { user } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const canManage =
    user?.id === review.author.id && review.status !== "DELETED";
  const remove = async () => {
    if (!canManage || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/reviews/${review.id}`, { method: "DELETE" });
      onDeleted(review.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: colors.line,
        paddingVertical: 21,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ink,
          }}
        >
          <T style={{ color: colors.sand, fontFamily: fonts.strong }}>
            {review.author.fullName.slice(0, 1).toUpperCase()}
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: rtl ? fonts.arabic : fonts.strong }}>
            {review.author.fullName}
          </T>
          <T style={{ fontSize: 12, color: colors.muted }}>
            {new Date(review.createdAt).toLocaleDateString(
              language === "ar" ? "ar-TN" : "fr-TN",
            )}
          </T>
        </View>
        <T style={{ fontFamily: fonts.strong }}>★ {review.rating}/5</T>
        {canManage && (
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
        )}
      </View>
      {canManage && menuOpen && (
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
                    params: { id: review.id },
                  });
                }}
              />
              <TextAction
                title={t.deleteReview}
                onPress={() => setConfirm(true)}
              />
            </>
          )}
          <Notice error text={error} />
        </View>
      )}
      <TextAction
        title={review.shop.name}
        onPress={() =>
          router.push({
            pathname: "/shops/[id]",
            params: { id: review.shop.id },
          })
        }
      />
      {review.productName && (
        <T style={{ color: colors.muted }}>{review.productName}</T>
      )}
      <T
        numberOfLines={detail ? undefined : 5}
        style={{ fontSize: 16, lineHeight: 26 }}
      >
        {review.text}
      </T>
      {review.status !== "PUBLISHED" && (
        <T accessibilityRole="alert" style={{ color: "#AC3024" }}>
          {review.status === "HIDDEN"
            ? language === "ar"
              ? "مخفي من الإدارة"
              : "Masqué par la modération"
            : language === "ar"
              ? "تمّ الحذف"
              : "Supprimé"}
        </T>
      )}
      {!!review.images.length && review.status === "PUBLISHED" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {review.images.map((image) => (
            <Pressable
              key={image.id}
              accessibilityRole="button"
              accessibilityLabel={
                language === "ar" ? "افتح الصورة" : "Ouvrir la photo"
              }
              onPress={() => setPhoto(API + image.path)}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <Image
                source={API + image.thumbnailPath}
                style={{
                  width: review.images.length === 1 ? 280 : 135,
                  height: 170,
                }}
                contentFit="cover"
                cachePolicy="none"
              />
            </Pressable>
          ))}
        </View>
      )}
      {!detail && (
        <TextAction
          title={language === "ar" ? "شوف الرأي" : "Voir l’avis"}
          onPress={() =>
            router.push({
              pathname: "/reviews/[id]",
              params: { id: review.id },
            })
          }
        />
      )}
      {review.status === "PUBLISHED" && (
        <ReviewActions
          key={`${review.id}:${review.liked}:${review.likeCount}`}
          review={review}
        />
      )}
      {children}
      <Modal
        visible={!!photo}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoto(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.94)",
            padding: 24,
            justifyContent: "center",
            gap: 20,
          }}
        >
          {photo && (
            <Image
              source={photo}
              style={{ width: "100%", height: "75%" }}
              contentFit="contain"
              cachePolicy="none"
            />
          )}
          <Button
            title={language === "ar" ? "إغلاق" : "Fermer"}
            onPress={() => setPhoto(null)}
          />
        </View>
      </Modal>
    </View>
  );
}
