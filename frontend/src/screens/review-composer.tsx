import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { api, API, post } from "../lib/api";
import { useDraft, type Draft } from "../lib/draft";
import { useLocale } from "../lib/locale";
import { uploadPhoto } from "../lib/upload-photo";
import type { Review } from "../lib/reviews";
import { Button, Field, Notice, Page, T, TextAction } from "../components/ui";
import { colors } from "../theme";
import { PurchaseDateField } from "../components/purchase-date-field";
export function ReviewComposer({ reviewId }: { reviewId?: string }) {
  const { user, ready: authReady } = useAuth();
  const { draft, update: saveDraft, clear, ready } = useDraft();
  const { t } = useLocale();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [ownerId, setOwner] = useState<string>();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoEnabled, setPhotoEnabled] = useState(false);
  const form = reviewId ? editing : draft;
  const update = (value: Partial<Draft>) =>
    reviewId
      ? setEditing((before) => (before ? { ...before, ...value } : before))
      : saveDraft(value);
  useEffect(() => {
    void api<{ enabled: boolean }>("/media/config")
      .then((value) => setPhotoEnabled(value.enabled))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!reviewId) return;
    let mounted = true;
    void api<Review>(`/reviews/${reviewId}`)
      .then((review) => {
        if (!mounted) return;
        setOwner(review.author.id);
        setStatus(review.status);
        setEditing({
          query: "",
          pendingName: "",
          pendingLink: "",
          shopId: review.shop.id,
          shopName: review.shop.name,
          text: review.text,
          rating: review.rating,
          productName: review.productName || "",
          purchaseDate: review.purchaseDate?.slice(0, 10) || "",
          photos: review.images.map((image) => ({
            localId: image.id,
            assetId: image.id,
            uri: API + image.path,
            status: "ready",
          })),
        });
      })
      .catch((value) => {
        if (mounted)
          setError(value instanceof Error ? value.message : t.network);
      });
    return () => {
      mounted = false;
    };
  }, [reviewId, t.network]);
  const choosePhotos = async () => {
    if (!form) return;
    setError("");
    if (process.env.EXPO_OS !== "web") {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return setError(t.photoPermission);
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5 - (form.photos?.length || 0),
        quality: 0.8,
      });
      if (!result.canceled)
        update({
          photos: [
            ...(form.photos || []),
            ...result.assets
              .slice(0, 5 - (form.photos?.length || 0))
              .map((asset) => ({
                localId: Crypto.randomUUID(),
                uri: asset.uri,
                status: "selected" as const,
              })),
          ],
        });
    } catch {
      setError(t.photoFailed);
    }
  };
  const submit = async (skipFailed = false) => {
    if (!form) return;
    setError("");
    if (!form.shopId || !form.rating || form.text.trim().length < 10)
      return setError(t.reviewValidation);
    if (!user) {
      router.push({ pathname: "/login", params: { returnTo: "/reviews/new" } });
      return;
    }
    setBusy(true);
    let photos = [...(form.photos || [])];
    try {
      if (
        form.purchaseDate &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(form.purchaseDate) ||
          form.purchaseDate > new Date().toISOString().slice(0, 10))
      )
        throw new Error(t.invalidPurchaseDate);
      for (let i = 0; i < photos.length; i++) {
        if (photos[i].assetId || (skipFailed && photos[i].status === "failed"))
          continue;
        photos[i] = { ...photos[i], status: "uploading" };
        update({ photos: [...photos] });
        setPhotoBusy(true);
        try {
          const assetId = await uploadPhoto(photos[i].uri);
          photos[i] = {
            ...photos[i],
            assetId,
            status: "ready",
            error: undefined,
          };
        } catch {
          photos[i] = { ...photos[i], status: "failed", error: t.photoFailed };
        }
        update({ photos: [...photos] });
        setPhotoBusy(false);
      }
      if (!skipFailed && photos.some((photo) => photo.status === "failed")) {
        setError(t.photoFailed);
        return;
      }
      const imageIds = photos
        .filter((photo) => photo.assetId)
        .map((photo) => photo.assetId!);
      const fields = {
        rating: form.rating,
        text: form.text.trim(),
        productName: form.productName.trim(),
        ...(form.purchaseDate || reviewId
          ? { purchaseDate: form.purchaseDate || null }
          : {}),
        imageIds,
      };
      let review: Review;
      if (reviewId)
        review = await api<Review>(`/reviews/${reviewId}`, {
          method: "PATCH",
          body: JSON.stringify(fields),
        });
      else {
        const submissionId = form.submissionId || Crypto.randomUUID();
        update({ submissionId });
        review = await post<Review>(`/shops/${form.shopId}/reviews`, {
          ...fields,
          submissionId,
        });
        await clear();
      }
      router.replace({ pathname: "/reviews/[id]", params: { id: review.id } });
    } catch (value) {
      setError(value instanceof Error ? value.message : t.network);
    } finally {
      setBusy(false);
      setPhotoBusy(false);
    }
  };
  if (!ready || !authReady || (reviewId && !editing && !error))
    return (
      <Page>
        <Notice text={t.loading} />
      </Page>
    );
  if (!form || (reviewId && ownerId !== user?.id))
    return (
      <Page>
        <Notice error text={error || t.unavailable} />
      </Page>
    );
  return (
    <Page title={t.reviewTitle} subtitle={t.reviewSubtitle}>
      {form.shopId ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <T style={{ fontSize: 20, flex: 1 }}>{form.shopName}</T>
          {!reviewId && (
            <TextAction
              title={t.changeShop}
              onPress={() =>
                router.push({ pathname: "/search", params: { review: "1" } })
              }
            />
          )}
        </View>
      ) : (
        <Button
          title={t.selectShop}
          onPress={() =>
            router.push({ pathname: "/search", params: { review: "1" } })
          }
        />
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <Pressable
            key={rating}
            accessibilityRole="radio"
            accessibilityLabel={`${rating} stars`}
            accessibilityState={{ checked: rating === form.rating }}
            onPress={() => update({ rating })}
            style={{ minWidth: 42, minHeight: 44, justifyContent: "center" }}
          >
            <T
              style={{
                fontSize: 32,
                color: form.rating >= rating ? colors.ink : "#AAAAB8",
              }}
            >
              ★
            </T>
          </Pressable>
        ))}
      </View>
      <Field
        label={t.reviewBody}
        multiline
        value={form.text}
        onChangeText={(text) => update({ text })}
        style={{ minHeight: 130, textAlignVertical: "top" }}
        maxLength={5000}
        testID="review-draft"
      />
      <Field
        label={t.product}
        value={form.productName}
        onChangeText={(productName) => update({ productName })}
        maxLength={150}
      />
      <PurchaseDateField
        value={form.purchaseDate || ""}
        onChange={(purchaseDate) => update({ purchaseDate })}
      />
      {!!form.photos?.length && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {form.photos.map((photo) => (
            <View key={photo.localId} style={{ width: 130, gap: 5 }}>
              <Image
                source={photo.uri}
                style={{ width: 130, height: 110, borderRadius: 10 }}
                contentFit="cover"
              />
              <Notice
                text={photo.status === "uploading" ? t.loading : photo.error}
                error={photo.status === "failed"}
              />
              <TextAction
                title={t.remove}
                onPress={() =>
                  update({
                    photos: form.photos?.filter(
                      (p) => p.localId !== photo.localId,
                    ),
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
      <Button
        secondary
        title={`+ ${t.addPhotos}`}
        disabled={!photoEnabled || busy || (form.photos?.length || 0) >= 5}
        onPress={() => void choosePhotos()}
        testID="choose-photos"
      />
      <Notice text={photoEnabled ? t.photoLimits : t.photoDisabled} />
      <Notice error text={error} />
      {status === "HIDDEN" && <Notice text={t.hiddenReview} />}
      <Button
        title={!user ? t.login : reviewId ? t.save : t.publish}
        busy={busy}
        disabled={photoBusy}
        onPress={() => void submit()}
        testID="publish-review"
      />
      {form.photos?.some((photo) => photo.status === "failed") && (
        <Button
          secondary
          title={t.publishWithoutFailed}
          busy={busy}
          onPress={() => void submit(true)}
        />
      )}
      {!reviewId && <Notice text={t.publishNow} />}
    </Page>
  );
}
