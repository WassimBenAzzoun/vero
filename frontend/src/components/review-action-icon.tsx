import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";
import { T } from "./ui";

const paths = {
  chat: "M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-6l-5 4v-4a4 4 0 0 1-3-4V8a4 4 0 0 1 4-4Z",
  share: "M12 14V3m-4 4 4-4 4 4M7 11H5v9h14v-9h-2",
  flag: "M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0",
};

export function ReviewActionIcon({
  icon,
  label,
  onPress,
  count,
}: {
  icon: keyof typeof paths;
  label: string;
  onPress: () => void;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: 6,
        gap: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: pressed ? colors.line : "transparent",
      })}
    >
      <Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}>
        <Path
          d={paths[icon]}
          fill="none"
          stroke={icon === "flag" ? "#B8322A" : colors.ink}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {count !== undefined && <T style={{ fontSize: 13 }}>{count}</T>}
    </Pressable>
  );
}
