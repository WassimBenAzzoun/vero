import { Field } from "./ui";
import { useLocale } from "../lib/locale";

export type PurchaseDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PurchaseDateField({ value, onChange }: PurchaseDateFieldProps) {
  const { t } = useLocale();
  return (
    <Field
      label={t.purchaseDate}
      placeholder="YYYY-MM-DD"
      value={value}
      onChangeText={onChange}
      maxLength={10}
    />
  );
}
