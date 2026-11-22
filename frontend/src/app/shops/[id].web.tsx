import { useLoaderData, useLocalSearchParams } from "expo-router";
import { createServerLoader } from "expo-router/server";
import { publicData } from "../../lib/public-loader";
import type { Shop } from "../../lib/shops";
import type { ReviewPage } from "../../lib/reviews";
import { ShopScreen } from "../../screens/shop-screen";
export const loader = createServerLoader(async (_request, params) => {
  if (typeof params.id !== "string" || !/^[a-f\d-]{36}$/i.test(params.id))
    return { shop: null, reviews: null };
  const shop = await publicData<Shop>(`/shops/${params.id}`);
  const reviews = shop
    ? await publicData<ReviewPage>(`/shops/${shop.id}/reviews`)
    : null;
  return { shop, reviews };
});
export default function ShopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLoaderData<typeof loader>();
  return (
    <ShopScreen
      key={id}
      id={id}
      initialShop={data?.shop}
      initialReviews={data?.reviews}
    />
  );
}
