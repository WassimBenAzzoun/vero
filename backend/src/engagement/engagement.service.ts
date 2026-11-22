import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
import {
  decodeCursor,
  encodeCursor,
  visibleReview,
} from '../reviews/review-query';
const commentSelect = {
  id: true,
  text: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, fullName: true, avatarUrl: true } },
} satisfies Prisma.ReviewCommentSelect;
@Injectable()
export class EngagementService {
  constructor(private readonly db: PrismaService) {}
  private async lock(
    tx: Prisma.TransactionClient,
    userId: string,
    reviewId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
    if (!(await tx.user.findFirst({ where: { id: userId, isActive: true } })))
      throw new UnauthorizedException();
    const review = await tx.review.findUnique({
      where: { id: reviewId },
      select: { shopId: true },
    });
    if (!review) throw new NotFoundException();
    await tx.$queryRaw`SELECT id FROM shops WHERE id=${review.shopId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM reviews WHERE id=${reviewId}::uuid FOR UPDATE`;
    if (
      !(await tx.review.findFirst({
        where: { id: reviewId, ...visibleReview },
      }))
    )
      throw new NotFoundException();
  }
  async like(reviewId: string, userId: string, add: boolean) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, userId, reviewId);
      if (add)
        await tx.reviewLike.upsert({
          where: { userId_reviewId: { userId, reviewId } },
          create: { userId, reviewId },
          update: {},
        });
      else await tx.reviewLike.deleteMany({ where: { userId, reviewId } });
      return {
        liked: add,
        likeCount: await tx.reviewLike.count({ where: { reviewId } }),
      };
    });
  }
  async comments(reviewId: string, query: CursorQueryDto) {
    if (
      !(await this.db.review.findFirst({
        where: { id: reviewId, ...visibleReview },
      }))
    )
      throw new NotFoundException();
    const scope = `comments:${reviewId}`,
      cursor = query.cursor ? decodeCursor(query.cursor, scope) : null,
      limit = query.limit || 20;
    const rows = await this.db.reviewComment.findMany({
      where: {
        reviewId,
        status: 'PUBLISHED',
        review: visibleReview,
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
      select: commentSelect,
    });
    return {
      items: rows.slice(0, limit),
      nextCursor:
        rows.length > limit ? encodeCursor(rows[limit - 1], scope) : null,
    };
  }
  async comment(reviewId: string, userId: string, text: string) {
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, userId, reviewId);
      return tx.reviewComment.create({
        data: { reviewId, authorId: userId, text },
        select: commentSelect,
      });
    });
  }
  async edit(id: string, userId: string, text?: string) {
    const row = await this.db.reviewComment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, userId, row.reviewId);
      await tx.$queryRaw`SELECT id FROM review_comments WHERE id=${id}::uuid FOR UPDATE`;
      const current = await tx.reviewComment.findUniqueOrThrow({
        where: { id },
      });
      if (current.authorId !== userId) throw new ForbiddenException();
      if (current.status === 'DELETED') throw new NotFoundException();
      return tx.reviewComment.update({
        where: { id },
        data:
          text === undefined
            ? { status: 'DELETED', deletedAt: new Date() }
            : { text },
        select: commentSelect,
      });
    });
  }
}
