import { BadRequestException, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FeedQueryDto } from '../reviews/reviews.dto';
import {
  decodeCursor,
  encodeCursor,
  reviewCard,
  reviewSelect,
  visibleReview,
} from '../reviews/review-query';

export function trendingScore(
  likers: number,
  commenters: number,
  ageHours: number,
) {
  return (likers + 2 * commenters) / Math.pow(Math.max(0, ageHours) + 2, 1.2);
}
@Injectable()
export class FeedService {
  constructor(private readonly db: PrismaService) {}
  @Cron('*/10 * * * *') async cleanup() {
    await this.db.feedSnapshot.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
  async list(query: FeedQueryDto, viewer?: string) {
    const limit = query.limit || 20;
    if (query.sort !== 'trending') {
      const cursor = query.cursor ? decodeCursor(query.cursor, 'latest') : null;
      const rows = await this.db.review.findMany({
        where: {
          ...visibleReview,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: new Date(cursor.date) } },
                  { createdAt: new Date(cursor.date), id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: reviewSelect(viewer),
      });
      return {
        items: rows.slice(0, limit).map(reviewCard),
        nextCursor:
          rows.length > limit ? encodeCursor(rows[limit - 1], 'latest') : null,
      };
    }
    let snapshotId: string,
      rank = -1;
    if (query.cursor) {
      try {
        const cursor = JSON.parse(
          Buffer.from(query.cursor, 'base64url').toString(),
        );
        if (
          cursor.sort !== 'trending' ||
          !/^[a-f\d-]{36}$/i.test(cursor.snapshotId) ||
          !Number.isInteger(cursor.rank) ||
          cursor.rank < 0
        )
          throw new Error();
        snapshotId = cursor.snapshotId;
        rank = cursor.rank;
      } catch {
        throw new BadRequestException({
          code: 'INVALID_CURSOR',
          message: 'Restart the feed.',
        });
      }
      if (
        !(await this.db.feedSnapshot.findFirst({
          where: { id: snapshotId, expiresAt: { gt: new Date() } },
        }))
      )
        throw new BadRequestException({
          code: 'FEED_EXPIRED',
          message: 'Refresh the feed.',
        });
    } else {
      const now = new Date(),
        recent = new Date(now.getTime() - 48 * 3600000);
      snapshotId = await this.db.$transaction(
        async (tx) => {
          // One consistent database view fixes both candidates and activity for this session.
          const candidates = await tx.review.findMany({
            where: {
              ...visibleReview,
              createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 500,
            select: {
              id: true,
              authorId: true,
              createdAt: true,
              likes: {
                where: { createdAt: { gte: recent }, user: { isActive: true } },
                select: { userId: true },
              },
              comments: {
                where: {
                  status: 'PUBLISHED',
                  createdAt: { gte: recent },
                  author: { isActive: true },
                },
                select: { authorId: true },
              },
            },
          });
          const ranked = candidates
            .map((row) => ({
              ...row,
              score: trendingScore(
                new Set(
                  row.likes
                    .filter((l) => l.userId !== row.authorId)
                    .map((l) => l.userId),
                ).size,
                new Set(
                  row.comments
                    .filter((c) => c.authorId !== row.authorId)
                    .map((c) => c.authorId),
                ).size,
                (now.getTime() - row.createdAt.getTime()) / 3600000,
              ),
            }))
            .sort(
              (a, b) =>
                b.score - a.score ||
                b.createdAt.getTime() - a.createdAt.getTime() ||
                b.id.localeCompare(a.id),
            );
          const snapshot = await tx.feedSnapshot.create({
            data: {
              algorithmVersion: 'v1',
              expiresAt: new Date(now.getTime() + 5 * 60000),
              entries: {
                create: ranked.map((row, rank) => ({
                  reviewId: row.id,
                    rank: rank + 1,
                  score: row.score,
                })),
              },
            },
          });
          return snapshot.id;
        },
        { isolationLevel: 'RepeatableRead' },
      );
    }
    const rows = await this.db.feedSnapshotEntry.findMany({
      where: { snapshotId, rank: { gt: rank }, review: visibleReview },
      orderBy: { rank: 'asc' },
      take: limit + 1,
      select: { rank: true, review: { select: reviewSelect(viewer) } },
    });
    return {
      items: rows.slice(0, limit).map((row) => reviewCard(row.review)),
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify({
                sort: 'trending',
                snapshotId,
                rank: rows[limit - 1].rank,
              }),
            ).toString('base64url')
          : null,
    };
  }
}
