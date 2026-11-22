import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type ShopStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto, ShopSearchDto } from './shops.dto';
import { looksLikeLink, normalizeShopLink } from './shop-link';

const shopSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  governorate: true,
  createdAt: true,
  category: { select: { key: true, labelFr: true, labelAr: true } },
  links: {
    select: { platform: true, normalizedUrl: true, handle: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.ShopSelect;
type ShopCard = Prisma.ShopGetPayload<{ select: typeof shopSelect }>;
type Cursor = { v: number; fingerprint: string; name: string; id: string };
@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}
  private async summaries(tx: Prisma.TransactionClient, shops: ShopCard[]) {
    const aggregate = await tx.review.groupBy({
      by: ['shopId'],
      where: { shopId: { in: shops.map((s) => s.id) }, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const map = new Map(aggregate.map((row) => [row.shopId, row]));
    return shops.map((shop) => ({
      ...shop,
      averageRating: map.get(shop.id)?._avg.rating ?? null,
      reviewCount: map.get(shop.id)?._count._all ?? 0,
    }));
  }
  async search(query: ShopSearchDto) {
    const q = query.q?.trim() || '';
    const limit = query.limit ?? 20;
    let where: Prisma.ShopWhereInput = { status: 'ACTIVE' };
    const link = q && looksLikeLink(q) ? normalizeShopLink(q) : null;
    const term = q.replace(/^@/, '');
    if (link) where.links = { some: { identityKey: link.identityKey } };
    else if (q)
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        {
          links: { some: { handle: { contains: term, mode: 'insensitive' } } },
        },
      ];
    const fingerprint = createHash('sha256')
      .update(link?.identityKey ?? q.toLowerCase())
      .digest('hex');
    if (query.cursor) {
      let cursor: Cursor;
      try {
        cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
        if (
          cursor.v !== 1 ||
          cursor.fingerprint !== fingerprint ||
          typeof cursor.name !== 'string' ||
          !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
            cursor.id,
          )
        )
          throw new Error();
      } catch {
        throw new BadRequestException({
          code: 'INVALID_CURSOR',
          message: 'Restart the search.',
        });
      }
      where = {
        AND: [
          where,
          {
            OR: [
              { name: { gt: cursor.name } },
              { name: cursor.name, id: { gt: cursor.id } },
            ],
          },
        ],
      };
    }
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.shop.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          take: limit + 1,
          select: shopSelect,
        });
        const more = rows.length > limit;
        const page = rows.slice(0, limit);
        const last = page.at(-1);
        return {
          items: await this.summaries(tx, page),
          nextCursor:
            more && last
              ? Buffer.from(
                  JSON.stringify({
                    v: 1,
                    fingerprint,
                    name: last.name,
                    id: last.id,
                  }),
                ).toString('base64url')
              : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async profile(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        let shop = await tx.shop.findUnique({
          where: { id },
          select: { ...shopSelect, status: true, mergedIntoId: true },
        });
        const seen = new Set<string>();
        while (
          shop?.status === 'MERGED' &&
          shop.mergedIntoId &&
          !seen.has(shop.id)
        ) {
          seen.add(shop.id);
          shop = await tx.shop.findUnique({
            where: { id: shop.mergedIntoId },
            select: { ...shopSelect, status: true, mergedIntoId: true },
          });
        }
        if (!shop || shop.status !== 'ACTIVE')
          throw new NotFoundException('Shop not found');
        const { status: _status, mergedIntoId: _target, ...publicShop } = shop;
        const [summary] = await this.summaries(tx, [publicShop]);
        const groups = await tx.review.groupBy({
          by: ['rating'],
          where: { shopId: shop.id, status: 'PUBLISHED' },
          _count: { _all: true },
        });
        return {
          ...summary,
          ...(id !== shop.id ? { redirectedFrom: id } : {}),
          starDistribution: Object.fromEntries(
            [1, 2, 3, 4, 5].map((rating) => [
              rating,
              groups.find((row) => row.rating === rating)?._count._all ?? 0,
            ]),
          ),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  private async duplicate(keys: string[]) {
    const matches = await this.prisma.shopLink.findMany({
      where: { identityKey: { in: keys } },
      select: { shop: { select: { id: true, status: true } } },
    });
    const ids = [...new Set(matches.map((match) => match.shop.id))];
    if (ids.length > 1)
      throw new ConflictException(
        'These links belong to different shops. Choose one shop.',
      );
    if (!matches.length) return null;
    if (matches[0].shop.status !== ('ACTIVE' satisfies ShopStatus))
      throw new ConflictException({
        code: 'SHOP_UNAVAILABLE',
        message: 'This shop is unavailable.',
      });
    return { shop: await this.profile(ids[0]), created: false };
  }
  async create(dto: CreateShopDto, userId: string) {
    const links = [
      ...new Map(
        dto.links.map((value) => {
          const link = normalizeShopLink(value);
          return [link.identityKey, link];
        }),
      ).values(),
    ];
    const existing = await this.duplicate(
      links.map((link) => link.identityKey),
    );
    if (existing) return existing; // Never attach new alternate identities to another user's shop.
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { isActive: true },
        });
        if (!user?.isActive) throw new UnauthorizedException();
        if (
          dto.categoryId &&
          !(await tx.category.findUnique({ where: { id: dto.categoryId } }))
        )
          throw new BadRequestException('Invalid category');
        const slug =
          dto.name
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'shop';
        const shop = await tx.shop.create({
          data: {
            name: dto.name.trim(),
            slug: `${slug}-${randomUUID().slice(0, 8)}`,
            description: dto.description,
            governorate: dto.governorate,
            categoryId: dto.categoryId,
            createdById: userId,
            links: { create: links },
          },
          select: { id: true },
        });
        return shop.id;
      });
      return { shop: await this.profile(id), created: true };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const winner = await this.duplicate(
          links.map((link) => link.identityKey),
        );
        if (winner) return winner;
      }
      throw error;
    }
  }
}
