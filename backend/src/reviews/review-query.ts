import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';

export const visibleReview = {
  status: 'PUBLISHED',
  shop: { status: 'ACTIVE' },
} satisfies Prisma.ReviewWhereInput;
export const reviewSelect = (viewerId?: string) =>
  ({
    id: true,
    rating: true,
    text: true,
    productName: true,
    purchaseDate: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    author: { select: { id: true, fullName: true, avatarUrl: true } },
    shop: { select: { id: true, name: true, slug: true } },
    images: {
      select: {
        position: true,
        mediaAsset: { select: { id: true, width: true, height: true } },
      },
      orderBy: { position: 'asc' },
    },
    _count: {
      select: { likes: true, comments: { where: { status: 'PUBLISHED' } } },
    },
    likes: {
      where: { userId: viewerId || '00000000-0000-0000-0000-000000000000' },
      select: { userId: true },
      take: 1,
    },
  }) satisfies Prisma.ReviewSelect;
export function reviewCard(row: any) {
  const { likes, _count, images, ...review } = row;
  return {
    ...review,
    images: images
      .filter((image: any) => image.mediaAsset)
      .map((image: any) => ({
        id: image.mediaAsset.id,
        width: image.mediaAsset.width,
        height: image.mediaAsset.height,
        path: `/media/${image.mediaAsset.id}`,
        thumbnailPath: `/media/${image.mediaAsset.id}?variant=thumb`,
      })),
    likeCount: _count.likes,
    commentCount: _count.comments,
    liked: likes.length > 0,
  };
}
export const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function decodeCursor(value: string, scope: string) {
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (
      cursor.scope !== scope ||
      typeof cursor.id !== 'string' ||
      !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
        cursor.id,
      ) ||
      typeof cursor.date !== 'string' ||
      !Number.isFinite(Date.parse(cursor.date))
    )
      throw new Error();
    return cursor as { id: string; date: string; scope: string };
  } catch {
    throw new BadRequestException({
      code: 'INVALID_CURSOR',
      message: 'Restart the list.',
    });
  }
}
export const encodeCursor = (
  row: { id: string; createdAt: Date },
  scope: string,
) =>
  Buffer.from(
    JSON.stringify({ id: row.id, date: row.createdAt.toISOString(), scope }),
  ).toString('base64url');
