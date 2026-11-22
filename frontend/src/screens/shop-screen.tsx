import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { api } from "../lib/api";
import { useDraft } from "../lib/draft";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import type { Shop } from "../lib/shops";
import { Button, Notice, Page, T, TextAction } from "../components/ui";
import { ReviewCard } from "../components/review-card";
import { ReportButton } from "../components/report-button";
import { sharePath } from "../lib/share";
import type { ReviewPage } from "../lib/reviews";
import { colors, fonts } from "../theme";
export function ShopScreen({
  id,
  initialShop,
  initialReviews,
}: {
  id: string;
  initialShop?: Shop | null;
  initialReviews?: ReviewPage | null;
}) {
  const { user } = useAuth();
  const { update } = useDraft();
  const { t, rtl, language } = useLocale();
  const [shop, setShop] = useState<Shop | null>(initialShop || null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [reviews, setReviews] = useState<ReviewPage | null>(
    initialReviews || null,
  );
  const [stars, setStars] = useState<number>();
  const [photos, setPhotos] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      void api<Shop>(
        `/shops/${encodeURIComponent(id)}${attempt ? `?retry=${attempt}` : ""}`,
      )
        .then((result) => {
          if (mounted) {
            setShop(result);
            setError("");
            void api<ReviewPage>(
              `/shops/${result.id}/reviews?${stars ? `stars=${stars}&` : ""}${photos ? "hasPhotos=true" : ""}`,
            )
              .then((value) => {
                if (mounted) setReviews(value);
              })
              .catch((e) => {
                if (mounted)
                  setError(e instanceof Error ? e.message : t.network);
              });
          }
        })
        .catch((value) => {
          if (mounted)
            setError(value instanceof Error ? value.message : t.network);
        });
      return () => {
        mounted = false;
      };
    }, [id, attempt, t.network, stars, photos]),
  );
  const write = () => {
    if (!shop) return;
    update({ shopId: shop.id, shopName: shop.name });
    router.push(
      user
        ? "/reviews/new"
        : { pathname: "/login", params: { returnTo: "/reviews/new" } },
    );
  };
  if (error)
    return (
      <Page title={t.shopNotFound}>
        <Notice error text={error} />
        <Button
          title={t.retry}
          onPress={() => setAttempt((value) => value + 1)}
        />
      </Page>
    );
  if (!shop)
    return (
      <Page>
        <ActivityIndicator color={colors.ink} />
      </Page>
    );
  return (
    <Page
      title={shop.name}
      subtitle={shop.description || shop.governorate || undefined}
    >
      {!!shop.links.length && (
        <View style={{ gap: 8 }}>
          <T
            accessibilityRole="header"
            style={{
              fontFamily: rtl ? fonts.arabic : fonts.strong,
              fontSize: 17,
            }}
          >
            {language === "ar" ? "روابط المحلّ" : "Liens de la boutique"}
          </T>
          {shop.links.map((link) => {
            const platform =
              link.platform === "INSTAGRAM"
                ? "Instagram"
                : link.platform === "FACEBOOK"
                  ? "Facebook"
                  : language === "ar"
                    ? "الموقع"
                    : "Site web";
            return (
              <Link
                key={link.normalizedUrl}
                href={link.normalizedUrl as `https://${string}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: colors.white,
                  borderWidth: 1,
                  borderColor: colors.line,
                  textAlign: rtl ? "right" : "left",
                }}
              >
                <T style={{ fontFamily: rtl ? fonts.arabic : fonts.strong }}>
                  {platform}
                  {link.handle ? ` · @${link.handle}` : ""}
                </T>
                {"\n"}
                <T
                  selectable
                  numberOfLines={2}
                  style={{
                    writingDirection: "ltr",
                    textAlign: "left",
                    color: colors.muted,
                    fontSize: 13,
                  }}
                >
                  {link.normalizedUrl}
                </T>
              </Link>
            );
          })}
        </View>
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.line,
          paddingVertical: 20,
          gap: 10,
        }}
      >
        <T
          style={{
            fontFamily: rtl ? fonts.arabic : fonts.heading,
            fontSize: 27,
          }}
        >
          {shop.averageRating === null
            ? t.noReviews
            : `★ ${shop.averageRating.toFixed(1)}`}
        </T>
        <T>
          {shop.reviewCount} {t.reviews}
        </T>
        {shop.starDistribution &&
          Object.entries(shop.starDistribution)
            .reverse()
            .map(([stars, count]) => (
              <View
                key={stars}
                style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
              >
                <T>{stars} ★</T>
                <View
                  style={{
                    height: 5,
                    flex: 1,
                    backgroundColor: colors.line,
                    borderRadius: 4,
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      width: `${shop.reviewCount ? (count / shop.reviewCount) * 100 : 0}%`,
                      backgroundColor: colors.ink,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <T>{count}</T>
              </View>
            ))}
      </View>
      {shop.category && (
        <T>
          {language === "ar" ? shop.category.labelAr : shop.category.labelFr}
        </T>
      )}
      <Button title={t.write} onPress={write} testID="shop-write" />
      <TextAction
        title={t.share}
        onPress={() =>
          void sharePath(`/shops/${shop.id}`).catch(() => setError(t.network))
        }
      />
      <ReportButton targetType="shop" targetId={shop.id} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[undefined, 5, 4, 3, 2, 1].map((value) => (
          <Button
            key={value || "all"}
            secondary={stars !== value}
            title={value ? `${value} ★` : t.allReviews}
            onPress={() => {
              setStars(value);
              setReviews(null);
            }}
          />
        ))}
        <Button
          secondary={!photos}
          title={language === "ar" ? "بالصور" : "Avec photos"}
          onPress={() => {
            setPhotos(!photos);
            setReviews(null);
          }}
        />
      </View>
      {!reviews ? (
        <Notice text={t.loading} />
      ) : !reviews.items.length ? (
        <Notice text={t.noItems} />
      ) : (
        reviews.items.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))
      )}
      {reviews?.nextCursor && (
        <Button
          title={t.next}
          onPress={() => {
            void api<ReviewPage>(
              `/shops/${shop.id}/reviews?${stars ? `stars=${stars}&` : ""}${photos ? "hasPhotos=true&" : ""}cursor=${encodeURIComponent(reviews.nextCursor!)}`,
            )
              .then((value) =>
                setReviews((before) => ({
                  items: [...(before?.items || []), ...value.items],
                  nextCursor: value.nextCursor,
                })),
              )
              .catch((e) =>
                setError(e instanceof Error ? e.message : t.network),
              );
          }}
        />
      )}
      <TextAction title={t.back} onPress={() => router.push("/")} />
    </Page>
  );
}
