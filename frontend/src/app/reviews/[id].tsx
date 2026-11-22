import { useLocalSearchParams } from "expo-router";
import { ReviewScreen } from "../../screens/review-screen";
export default function ReviewPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewScreen key={id} id={id} />;
}
