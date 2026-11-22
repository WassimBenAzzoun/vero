import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useAuth } from "../lib/auth";
import { useLocale } from "../lib/locale";
import { post } from "../lib/api";
import { colors } from "../theme";
import { Button, Field, Notice, T, TextAction } from "./ui";
import { ReviewActionIcon } from "./review-action-icon";
const reasons = [
  ["SPAM", "Spam", "إشهار مزعج"],
  ["ABUSE", "Contenu offensant", "إساءة"],
  ["MISLEADING", "Trompeur", "مضلّل"],
  ["WRONG_SHOP", "Mauvaise boutique", "متجر غالط"],
  ["DUPLICATE_SHOP", "Boutique en double", "متجر مكرّر"],
  ["OTHER", "Autre", "سبب آخر"],
] as const;
export function ReportButton({
  targetId,
  targetType,
}: {
  targetId: string;
  targetType: "review" | "comment" | "shop";
}) {
  const { user } = useAuth(),
    { t, language } = useLocale(),
    path = usePathname();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState<string>("SPAM"),
    [details, setDetails] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await post("/reports", { targetId, targetType, reason, details });
      setOpen(false);
      setMessage(t.reportSent);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.network);
    } finally {
      setBusy(false);
    }
  };
  const show = () => {
    if (!user) router.push({ pathname: "/login", params: { returnTo: path } });
    else {
      setOpen(true);
      setMessage("");
    }
  };
  return (
    <View>
      {targetType === "review" ? (
        <ReviewActionIcon icon="flag" label={t.report} onPress={show} />
      ) : (
        <TextAction title={t.report} onPress={show} />
      )}
      <Notice text={!open ? message : ""} />
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(20,26,70,.55)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <ScrollView
            style={{
              maxHeight: "85%",
              backgroundColor: colors.sand,
              borderRadius: 18,
            }}
            contentContainerStyle={{ padding: 24, gap: 15 }}
          >
            <T style={{ fontSize: 24 }}>{t.report}</T>
            {reasons.map(([key, fr, ar]) => (
              <Button
                key={key}
                title={language === "ar" ? ar : fr}
                secondary={reason !== key}
                onPress={() => setReason(key)}
              />
            ))}
            <Field
              label={t.reportDetails}
              value={details}
              onChangeText={setDetails}
              maxLength={2000}
              multiline
            />
            <Notice error text={message} />
            <Button title={t.report} busy={busy} onPress={() => void send()} />
            <TextAction title={t.cancel} onPress={() => setOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
