import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts } from "../theme";
import { useLocale } from "../lib/locale";
export function T({ style, ...props }: TextProps) {
  const { rtl } = useLocale();
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.ink,
          fontFamily: rtl ? fonts.arabic : fonts.body,
          fontSize: 15,
          lineHeight: rtl ? 27 : 23,
          textAlign: rtl ? "right" : "left",
          writingDirection: rtl ? "rtl" : "ltr",
        },
        style,
      ]}
    />
  );
}
export function Brand() {
  return (
    <View
      accessibilityLabel="Vero"
      style={{ direction: "ltr", flexDirection: "row", alignItems: "center" }}
    >
      <Text
        style={{
          color: colors.ink,
          fontFamily: fonts.heading,
          fontSize: 44,
          lineHeight: 58,
          letterSpacing: -2,
        }}
      >
        ver
      </Text>
      <Svg width={38} height={43} viewBox="0 0 38 43">
        <Circle
          cx="16"
          cy="18"
          r="12"
          stroke={colors.ink}
          strokeWidth="5"
          fill="none"
        />
        <Path
          d="M25 28L34 39"
          stroke={colors.ink}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Path
          d="M10 18L14 22L22 14"
          stroke={colors.green}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  busy,
  secondary,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  const { rtl } = useLocale();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: 13,
        paddingHorizontal: 18,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        borderWidth: secondary ? 1 : 0,
        borderColor: colors.ink,
        backgroundColor: secondary ? "transparent" : colors.ink,
        opacity: disabled || busy ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      {busy && (
        <ActivityIndicator color={secondary ? colors.ink : colors.white} />
      )}
      <T
        style={{
          color: secondary ? colors.ink : colors.white,
          fontFamily: rtl ? fonts.arabic : fonts.strong,
          textAlign: "center",
          fontSize: 16,
        }}
      >
        {title}
      </T>
    </Pressable>
  );
}
export function Field({
  label,
  password,
  hideLabel,
  ...props
}: TextInputProps & {
  label: string;
  password?: boolean;
  hideLabel?: boolean;
}) {
  const { rtl } = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {!hideLabel && (
        <T style={{ fontFamily: rtl ? fonts.arabic : fonts.strong }}>{label}</T>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: "#AAAAB8",
          borderRadius: 12,
        }}
      >
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={password && !visible}
          style={[
            {
              flex: 1,
              minHeight: 50,
              paddingHorizontal: 15,
              paddingVertical: 12,
              color: colors.ink,
              fontFamily: rtl ? fonts.arabic : fonts.body,
              fontSize: 16,
              borderRadius: 12,
              textAlign:
                props.keyboardType === "email-address"
                  ? "left"
                  : rtl
                    ? "right"
                    : "left",
            },
            props.style,
          ]}
          placeholderTextColor={colors.muted}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible(!visible)}
            style={{ padding: 13 }}
          >
            <Svg width="20" height="20" viewBox="0 0 24 24">
              <Path
                d="M2 12C7 3 17 3 22 12C17 21 7 21 2 12Z"
                stroke={colors.ink}
                strokeWidth="1.8"
                fill="none"
              />
              <Circle
                cx="12"
                cy="12"
                r="3"
                stroke={colors.ink}
                strokeWidth="1.8"
                fill="none"
              />
            </Svg>
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Notice({ text, error }: { text?: string; error?: boolean }) {
  return text ? (
    <T
      accessibilityRole="alert"
      style={{ color: error ? "#AC3024" : colors.muted }}
    >
      {text}
    </T>
  ) : null;
}
export function TextAction({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const { rtl } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <T style={{ fontFamily: rtl ? fonts.arabic : fonts.strong }}>{title}</T>
    </Pressable>
  );
}
export function Page({
  title,
  subtitle,
  children,
  nav = true,
  wide = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  nav?: boolean;
  wide?: boolean;
}) {
  const { rtl, language, setLanguage, t } = useLocale();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.sand }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: 30,
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: wide ? 1240 : 480,
            alignSelf: "center",
            gap: 23,
            direction: rtl ? "rtl" : "ltr",
          }}
        >
          <View
            style={{
              direction: "ltr",
              flexDirection: rtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 15,
            }}
          >
            <Pressable
              onPress={() => router.push("/")}
              accessibilityRole="link"
            >
              <Brand />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {(["fr", "ar"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setLanguage(value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor:
                      language === value ? colors.ink : "transparent",
                  }}
                >
                  <T
                    style={{
                      color: language === value ? colors.white : colors.ink,
                      fontFamily: value === "ar" ? fonts.arabic : fonts.strong,
                    }}
                  >
                    {value === "fr" ? "FR" : "عربي"}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
          <View
            style={{
              marginTop: 10,
              width: 48,
              height: 6,
              backgroundColor: colors.green,
              borderRadius: 4,
            }}
          />
          {title && (
            <View style={{ gap: 9, marginBottom: 7 }}>
              <T
                style={{
                  fontFamily: rtl ? fonts.arabic : fonts.heading,
                  fontSize: 34,
                  lineHeight: rtl ? 51 : 43,
                  letterSpacing: rtl ? 0 : -1,
                }}
              >
                {title}
              </T>
              {subtitle && (
                <T style={{ fontSize: 17, lineHeight: 27 }}>{subtitle}</T>
              )}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
      {nav && (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 10,
            paddingHorizontal: 18,
            borderTopWidth: 1,
            borderColor: colors.line,
            flexDirection: rtl ? "row-reverse" : "row",
            justifyContent: "space-around",
            backgroundColor: colors.sand,
          }}
        >
          {[
            [t.feed, "/"],
            [t.search, "/search"],
            [t.write, "/reviews/new"],
            [t.profile, "/profile"],
          ].map(([label, route], index) => (
            <Pressable
              key={route}
              accessibilityRole="link"
              onPress={() => router.push(route as "/")}
              accessibilityState={{
                selected:
                  route === "/"
                    ? pathname === "/" || pathname.startsWith("/shops")
                    : pathname.startsWith(route),
              }}
              style={{ padding: 8, alignItems: "center", gap: 5, flex: 1 }}
            >
              <Svg width={23} height={23} viewBox="0 0 24 24">
                {index === 0 ? (
                  <Path
                    d="M3 4H21 M3 12H21 M3 20H15"
                    stroke={colors.ink}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                ) : index === 1 ? (
                  <>
                    <Circle
                      cx="10"
                      cy="10"
                      r="7"
                      fill="none"
                      stroke={colors.ink}
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M15 15L22 22"
                      stroke={colors.ink}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </>
                ) : index === 2 ? (
                  <Path
                    d="M4 16L3 22L9 21L21 9L15 3Z M13 5L19 11"
                    fill="none"
                    stroke={colors.ink}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <Circle
                      cx="12"
                      cy="7"
                      r="4"
                      fill="none"
                      stroke={colors.ink}
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M4 22V18C4 12 20 12 20 18V22"
                      fill="none"
                      stroke={colors.ink}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </Svg>
              <T
                style={{
                  fontSize: 12,
                  fontFamily: rtl ? fonts.arabic : fonts.strong,
                }}
              >
                {label}
              </T>
              <View
                style={{
                  height: 3,
                  width: 40,
                  borderRadius: 2,
                  backgroundColor: (
                    route === "/"
                      ? pathname === "/" || pathname.startsWith("/shops")
                      : pathname.startsWith(route)
                  )
                    ? colors.green
                    : "transparent",
                }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
