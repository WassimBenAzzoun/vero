import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, EditReviewDto, ReviewQueryDto } from './reviews.dto';
import {
  decodeCursor,
  encodeCursor,
  fingerprint,
  reviewCard,
  reviewSelect,
  visibleReview,
} from './review-query';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  private date(value?: string | null) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value ||
      value > new Date().toISOString().slice(0, 10)
    )
      throw new BadRequestException(
        'Choose a valid purchase date in the past or today',
      );
    return parsed;
  }
  private async attachments(
    tx: Prisma.TransactionClient,
    authorId: string,
    imageIds: string[],
    reviewId?: string,
  ) {
    for (const id of [...imageIds].sort())
      await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${id}::uuid FOR UPDATE`;
    const assets = await tx.mediaAsset.findMany({
      where: {
        id: { in: imageIds },
        uploaderId: authorId,
        status: 'READY',
        logos: { none: {} },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        ...(reviewId
          ? {
              OR: [{ reviewImage: null }, { reviewImage: { reviewId } }],
              AND: [
                {
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
              ],
            }
          : { reviewImage: null }),
      },
    });
    if (
      assets.length !== imageIds.length ||
      new Set(imageIds).size !== imageIds.length ||
      imageIds.length > 5
    )
      throw new BadRequestException(
        'Choose up to five ready photos uploaded by your account',
      );
    await tx.mediaAsset.updateMany({
      where: { id: { in: imageIds } },
      data: { expiresAt: null },
    });
  }
  async create(shopId: string, authorId: string, dto: CreateReviewDto) {
    const purchaseDate = this.date(dto.purchaseDate);
    const hash = fingerprint({
      shopId,
      rating: dto.rating,
      text: dto.text.trim(),
      productName: dto.productName?.trim() || null,
      purchaseDate: dto.purchaseDate || null,
      imageIds: dto.imageIds || [],
    });
    const id = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${authorId}::uuid FOR UPDATE`;
      if (!(await tx.user.findUnique({ where: { id: authorId } }))?.isActive)
        throw new UnauthorizedException();
      const previous = await tx.review.findUnique({
        where: {
          authorId_submissionId: { authorId, submissionId: dto.submissionId },
        },
      });
      if (previous) {
        if (previous.submissionHash !== hash)
          throw new ConflictException(
            'This submission was already used with different content. Check your reviews before starting again.',
          );
        return previous.id;
      }
      let canonical = shopId;
      const seen = new Set<string>();
      while (true) {
        if (seen.has(canonical)) throw new NotFoundException('Shop not found');
        seen.add(canonical);
        await tx.$queryRaw`SELECT id FROM shops WHERE id = ${canonical}::uuid FOR UPDATE`;
        const shop = await tx.shop.findUnique({ where: { id: canonical } });
        if (!shop || shop.status === 'HIDDEN')
          throw new NotFoundException('Shop not found');
        if (shop.status === 'MERGED' && shop.mergedIntoId) {
          canonical = shop.mergedIntoId;
          continue;
        }
        break;
      }
      await this.attachments(tx, authorId, dto.imageIds || []);
      const review = await tx.review.create({
        data: {
          authorId,
          shopId: canonical,
          submissionId: dto.submissionId,
          submissionHash: hash,
          rating: dto.rating,
          text: dto.text.trim(),
          productName: dto.productName?.trim() || null,
          purchaseDate,
          images: {
            create: (dto.imageIds || []).map((mediaAssetId, position) => ({
              mediaAssetId,
              position,
            })),
          },
        },
        select: { id: true },
      });
      return review.id;
    });
    return this.detail(id, authorId);
  }
  async list(
    shopId: string | undefined,
    query: ReviewQueryDto,
    viewerId?: string,
    own = false,
  ) {
    const scope = fingerprint({
      shopId,
      stars: query.stars,
      photos: query.hasPhotos,
      own: own ? viewerId : false,
    });
    const filters: Prisma.ReviewWhereInput[] = [
      own ? { authorId: viewerId, status: { not: 'DELETED' } } : visibleReview,
    ];
    if (shopId) filters.push({ shopId });
    if (query.stars) filters.push({ rating: query.stars });
    if (query.hasPhotos !== undefined)
      filters.push({ images: query.hasPhotos ? { some: {} } : { none: {} } });
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor, scope);
      filters.push({
        OR: [
          { createdAt: { lt: new Date(cursor.date) } },
          { createdAt: new Date(cursor.date), id: { lt: cursor.id } },
        ],
      });
    }
    if (
      shopId &&
      !own &&
      !(await this.prisma.shop.findFirst({
        where: { id: shopId, status: 'ACTIVE' },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Shop not found');
    const rows = await this.prisma.review.findMany({
      where: { AND: filters },
      select: reviewSelect(viewerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: (query.limit || 20) + 1,
    });
    const more = rows.length > (query.limit || 20);
    const page = rows.slice(0, query.limit || 20);
    return {
      items: page.map(reviewCard),
      nextCursor:
        more && page.length ? encodeCursor(page.at(-1)!, scope) : null,
    };
  }
  async detail(id: string, viewerId?: string) {
    const row = await this.prisma.review.findFirst({
      where: {
        id,
        OR: [visibleReview, ...(viewerId ? [{ authorId: viewerId }] : [])],
      },
      select: reviewSelect(viewerId),
    });
    if (!row) throw new NotFoundException('Review not found');
    return reviewCard(row);
  }
  async edit(id: string, authorId: string, dto: EditReviewDto, remove = false) {
    const date = this.date(dto.purchaseDate);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${authorId}::uuid FOR UPDATE`;
      const initial = await tx.review.findUnique({ where: { id } });
      if (!initial || initial.authorId !== authorId)
        throw new ForbiddenException('You can only change your own review');
      await tx.$queryRaw`SELECT id FROM shops WHERE id = ${initial.shopId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM reviews WHERE id = ${id}::uuid FOR UPDATE`;
      const review = await tx.review.findUniqueOrThrow({ where: { id } });
      if (review.status === 'DELETED')
        throw new NotFoundException('Review not found');
      if (!(await tx.user.findUnique({ where: { id: authorId } }))?.isActive)
        throw new UnauthorizedException();
      if (dto.imageIds !== undefined) {
        await this.attachments(tx, authorId, dto.imageIds, id);
        const detached = await tx.reviewImage.findMany({
          where: { reviewId: id, mediaAssetId: { notIn: dto.imageIds } },
          select: { mediaAssetId: true },
        });
        await tx.reviewImage.deleteMany({ where: { reviewId: id } });
        await tx.mediaAsset.updateMany({
          where: { id: { in: detached.map((row) => row.mediaAssetId) } },
          data: { expiresAt: new Date(Date.now() + 86400000) },
        });
        await tx.reviewImage.createMany({
          data: dto.imageIds.map((mediaAssetId, position) => ({
            reviewId: id,
            mediaAssetId,
            position,
          })),
        });
      }
      await tx.review.update({
        where: { id },
        data: remove
          ? { status: 'DELETED', deletedAt: new Date() }
          : {
              ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
              ...(dto.text !== undefined ? { text: dto.text.trim() } : {}),
              ...(dto.productName !== undefined
                ? { productName: dto.productName.trim() || null }
                : {}),
              ...(dto.purchaseDate !== undefined
                ? { purchaseDate: date ?? null }
                : {}),
            },
      });
      if (remove) {
        const images = await tx.reviewImage.findMany({
          where: { reviewId: id },
          select: { mediaAssetId: true },
        });
        await tx.mediaAsset.updateMany({
          where: { id: { in: images.map((i) => i.mediaAssetId) } },
          data: {
            status: 'DELETED',
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
      }
    });
    return remove ? { message: 'Review deleted' } : this.detail(id, authorId);
  }
}
