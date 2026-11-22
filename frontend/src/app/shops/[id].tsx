import { useLocalSearchParams } from "expo-router";
import { ShopScreen } from "../../screens/shop-screen";
export default function ShopPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShopScreen key={id} id={id} />;
}
