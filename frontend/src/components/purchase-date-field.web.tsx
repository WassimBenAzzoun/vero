import { useId } from "react";
import { View } from "react-native";
import { useLocale } from "../lib/locale";
import { colors, fonts } from "../theme";
import { TextAction } from "./ui";
import type { PurchaseDateFieldProps } from "./purchase-date-field";

export function PurchaseDateField({ value, onChange }: PurchaseDateFieldProps) {
  const { t, rtl, language } = useLocale();
  const id = useId();
  const max = new Date().toISOString().slice(0, 10);
  const fontFamily = rtl ? fonts.arabic : fonts.body;

  return (
    <View style={{ gap: 8 }}>
      <label
        htmlFor={id}
        style={{
          color: colors.ink,
          fontFamily: rtl ? fonts.arabic : fonts.strong,
          fontSize: 15,
          lineHeight: rtl ? "27px" : "23px",
        }}
      >
        {t.purchaseDate}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        max={max}
        lang={language === "ar" ? "ar-TN" : "fr-TN"}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
          minHeight: 52,
          padding: "10px 14px",
          color: colors.ink,
          backgroundColor: colors.white,
          border: "1px solid #AAAAB8",
          borderRadius: 12,
          fontFamily,
          fontSize: 16,
        }}
      />
      {value && (
        <TextAction title={t.clearPurchaseDate} onPress={() => onChange("")} />
      )}
    </View>
  );
}
