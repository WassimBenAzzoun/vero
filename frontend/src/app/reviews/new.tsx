import { useState } from "react";
import { router } from "expo-router";
import { View, Pressable } from "react-native";
import { useAuth } from "../../lib/auth";
import { useDraft } from "../../lib/draft";
import { useLocale } from "../../lib/locale";
import {
  Button,
  Field,
  Notice,
  Page,
  T,
  TextAction,
} from "../../components/ui";
import { colors } from "../../theme";
export default function ReviewDraft() {
  const { user, ready } = useAuth();
  const { draft, update, ready: draftReady } = useDraft();
  const { t } = useLocale();
  const [notice, setNotice] = useState("");
  if (!ready || !draftReady)
    return (
      <Page>
        <Notice text={t.loading} />
      </Page>
    );
  return (
    <Page
      title={t.reviewTitle}
      subtitle={draft.shopId ? t.reviewSubtitle : t.selectShop}
    >
      {draft.shopId ? (
        <>
          <T style={{ fontSize: 20 }}>{draft.shopName}</T>
          <TextAction
            title={t.changeShop}
            onPress={() =>
              router.push({ pathname: "/", params: { review: "1" } })
            }
          />
        </>
      ) : (
        <Button
          title={t.selectShop}
          onPress={() =>
            router.push({ pathname: "/", params: { review: "1" } })
          }
        />
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} stars`}
            accessibilityState={{ checked: value === draft.rating }}
            onPress={() => update({ rating: value })}
            style={{ minWidth: 42, minHeight: 44, justifyContent: "center" }}
          >
            <T
              style={{
                fontSize: 32,
                color: draft.rating >= value ? colors.ink : "#AAAAB8",
              }}
            >
              ★
            </T>
          </Pressable>
        ))}
      </View>
      <Field
        label={t.draftLabel}
        multiline
        value={draft.text}
        onChangeText={(text) => {
          update({ text });
          setNotice("");
        }}
        style={{ minHeight: 130, textAlignVertical: "top" }}
        maxLength={5000}
        testID="review-draft"
      />
      <Field
        label={t.product}
        value={draft.productName}
        onChangeText={(productName) => update({ productName })}
        maxLength={150}
      />
      {!user && (
        <Button
          title={t.login}
          onPress={() =>
            router.push({
              pathname: "/login",
              params: { returnTo: "/reviews/new" },
            })
          }
        />
      )}
      <Notice text={t.reviewNext} />
      <Notice text={notice} />
    </Page>
  );
}
