export type Shop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  governorate: string | null;
  links: {
    platform: "INSTAGRAM" | "FACEBOOK" | "WEBSITE";
    normalizedUrl: string;
    handle: string | null;
  }[];
  category: { key: string; labelFr: string; labelAr: string } | null;
  averageRating: number | null;
  reviewCount: number;
  starDistribution?: Record<string, number>;
};
export type ShopPage = { items: Shop[]; nextCursor: string | null };
