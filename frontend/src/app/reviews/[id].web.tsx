import { useLoaderData, useLocalSearchParams } from "expo-router";
import { createServerLoader } from "expo-router/server";
import { publicData } from "../../lib/public-loader";
import type { Review } from "../../lib/reviews";
import { ReviewScreen } from "../../screens/review-screen";
export const loader = createServerLoader(async (_request, params) =>
  typeof params.id === "string" && /^[a-f\d-]{36}$/i.test(params.id)
    ? publicData<Review>(`/reviews/${params.id}`)
    : null,
);
export default function ReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLoaderData<typeof loader>();
  return <ReviewScreen key={id} id={id} initialReview={data} />;
}
