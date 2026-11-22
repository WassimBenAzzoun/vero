import type { Shop } from "./shops";
export type Review = {
  id: string;
  rating: number;
  text: string;
  productName: string | null;
  purchaseDate: string | null;
  status: "PUBLISHED" | "HIDDEN" | "DELETED";
  createdAt: string;
  updatedAt: string;
  author: { id: string; fullName: string; avatarUrl: string | null };
  shop: Pick<Shop, "id" | "name" | "slug">;
  images: {
    id: string;
    path: string;
    thumbnailPath: string;
    width: number;
    height: number;
  }[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
};
export type ReviewPage = { items: Review[]; nextCursor: string | null };
