import { useLocalSearchParams } from "expo-router";
import { ReviewComposer } from "../../../screens/review-composer";
export default function EditReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewComposer key={id} reviewId={id} />;
}
