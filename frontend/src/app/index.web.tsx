import { useLoaderData } from "expo-router";
import { createServerLoader } from "expo-router/server";
import { publicData } from "../lib/public-loader";
import type { ReviewPage } from "../lib/reviews";
import { FeedScreen } from "../screens/feed-screen";
export const loader = createServerLoader(() =>
  publicData<ReviewPage>("/feed?sort=latest"),
);
export default function FeedRoute() {
  const data = useLoaderData<typeof loader>();
  return <FeedScreen initialData={data} />;
}
