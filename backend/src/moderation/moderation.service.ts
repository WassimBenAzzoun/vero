import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { decodeCursor, encodeCursor } from '../reviews/review-query';
import { normalizeShopLink } from '../shops/shop-link';
import {
  ActionDto,
  AdminListDto,
  CorrectShopDto,
  MergeDto,
} from './moderation.dto';
const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;
export type AdminKind =
  'reports' | 'reviews' | 'comments' | 'shops' | 'members' | 'history';
@Injectable()
export class ModerationService {
  constructor(private readonly db: PrismaService) {}
  async list(kind: AdminKind, query: AdminListDto) {
    const scope = `admin:${kind}:${query.status || ''}`,
      cursor = query.cursor ? decodeCursor(query.cursor, scope) : null,
      limit = query.limit || 20;
    const where = cursor
      ? {
          OR: [
            { createdAt: { lt: new Date(cursor.date) } },
            { createdAt: new Date(cursor.date), id: { lt: cursor.id } },
          ],
        }
      : {};
    const args = {
      where,
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      take: limit + 1,
    };
    let rows: any[];
    switch (kind) {
      case 'reports':
        rows = await this.db.report.findMany({
          ...args,
          where: {
            ...where,
            ...(query.status ? { status: query.status } : {}),
          },
          include: {
            shop: { select: { id: true, name: true, status: true } },
            review: {
              select: { id: true, text: true, status: true, shopId: true },
            },
            comment: {
              select: { id: true, text: true, status: true, reviewId: true },
            },
            reporter: { select: { id: true, fullName: true } },
          },
        });
        break;
      case 'reviews':
        rows = await this.db.review.findMany({
          ...args,
          select: {
            id: true,
            text: true,
            rating: true,
            status: true,
            createdAt: true,
            author: { select: { id: true, fullName: true } },
            shop: { select: { id: true, name: true } },
          },
        });
        break;
      case 'comments':
        rows = await this.db.reviewComment.findMany({
          ...args,
          select: {
            id: true,
            text: true,
            status: true,
            reviewId: true,
            createdAt: true,
            author: { select: { id: true, fullName: true } },
          },
        });
        break;
      case 'shops':
        rows = await this.db.shop.findMany({
          ...args,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            mergedIntoId: true,
            createdAt: true,
            links: true,
          },
        });
        break;
      case 'members':
        rows = await this.db.user.findMany({ ...args, select: userSelect });
        break;
      case 'history':
        rows = await this.db.moderationAction.findMany({
          ...args,
          include: { admin: { select: { id: true, fullName: true } } },
        });
        break;
    }
    return {
      items: rows.slice(0, limit),
      nextCursor:
        rows.length > limit ? encodeCursor(rows[limit - 1], scope) : null,
    };
  }
  private async admin(tx: Prisma.TransactionClient, id: string) {
    // Serializes admin decisions, including concurrent administrator suspensions.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(882211)`;
    if (
      !(await tx.user.findFirst({
        where: { id, role: 'ADMIN', isActive: true },
      }))
    )
      throw new ForbiddenException();
  }
  private audit(
    tx: Prisma.TransactionClient,
    adminId: string,
    targetType: any,
    targetId: string,
    action: any,
    reason: string,
    previousState: unknown,
    newState: unknown,
  ) {
    return tx.moderationAction.create({
      data: {
        adminId,
        targetType,
        targetId,
        action,
        reason,
        previousState: JSON.parse(JSON.stringify(previousState)),
        newState: JSON.parse(JSON.stringify(newState)),
      },
    });
  }
  async action(
    kind: Exclude<AdminKind, 'history'>,
    id: string,
    adminId: string,
    dto: ActionDto,
  ) {
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, adminId);
      if (kind === 'members') {
        if (!['suspend', 'reactivate'].includes(dto.action))
          throw new BadRequestException();
        await tx.$queryRaw`SELECT id FROM users WHERE id=${id}::uuid FOR UPDATE`;
        const before = await tx.user.findUnique({
          where: { id },
          select: { id: true, isActive: true, role: true, deletedAt: true },
        });
        if (!before) throw new NotFoundException();
        if (id === adminId || before.deletedAt)
          throw new ForbiddenException('Cannot change this account');
        if (
          dto.action === 'suspend' &&
          before.role === 'ADMIN' &&
          (await tx.user.count({ where: { role: 'ADMIN', isActive: true } })) <=
            1
        )
          throw new ForbiddenException('Keep an active administrator');
        const after = await tx.user.update({
          where: { id },
          data: { isActive: dto.action === 'reactivate' },
          select: userSelect,
        });
        if (dto.action === 'suspend')
          await tx.session.updateMany({
            where: { userId: id },
            data: { revokedAt: new Date() },
          });
        await this.audit(
          tx,
          adminId,
          'USER',
          id,
          dto.action === 'suspend' ? 'SUSPEND' : 'REACTIVATE',
          dto.reason,
          before,
          { isActive: after.isActive },
        );
        return after;
      }
      if (kind === 'reports') {
        if (!['resolve', 'dismiss'].includes(dto.action))
          throw new BadRequestException();
        const before = await tx.report.findUnique({ where: { id } });
        if (!before) throw new NotFoundException();
        const after = await tx.report.update({
          where: { id },
          data: {
            status: dto.action === 'resolve' ? 'RESOLVED' : 'DISMISSED',
            resolvedById: adminId,
            resolvedAt: new Date(),
            resolutionReason: dto.reason,
          },
        });
        await this.audit(
          tx,
          adminId,
          'REPORT',
          id,
          dto.action === 'resolve' ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
          dto.reason,
          { status: before.status },
          { status: after.status },
        );
        return { id: after.id, status: after.status };
      }
      if (!['hide', 'restore'].includes(dto.action))
        throw new BadRequestException();
      const status =
        dto.action === 'hide'
          ? 'HIDDEN'
          : kind === 'shops'
            ? 'ACTIVE'
            : 'PUBLISHED';
      let before: any, after: any;
      if (kind === 'shops') {
        await tx.$queryRaw`SELECT id FROM shops WHERE id=${id}::uuid FOR UPDATE`;
        before = await tx.shop.findUnique({ where: { id } });
        if (!before) throw new NotFoundException();
        if (before.status === 'MERGED')
          throw new ConflictException('Use the destination shop');
        after = await tx.shop.update({
          where: { id },
          data: { status: status as any },
        });
      } else {
        const row =
          kind === 'reviews'
            ? await tx.review.findUnique({
                where: { id },
                select: { shopId: true, id: true },
              })
            : await tx.reviewComment
                .findUnique({
                  where: { id },
                  select: { review: { select: { shopId: true, id: true } } },
                })
                .then((c) => c?.review);
        if (!row) throw new NotFoundException();
        await tx.$queryRaw`SELECT id FROM shops WHERE id=${row.shopId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM reviews WHERE id=${row.id}::uuid FOR UPDATE`;
        if (kind === 'reviews') {
          before = await tx.review.findUniqueOrThrow({ where: { id } });
          if (before.status === 'DELETED')
            throw new ConflictException('Deleted content cannot be restored');
          after = await tx.review.update({
            where: { id },
            data: { status: status as any },
          });
        } else {
          await tx.$queryRaw`SELECT id FROM review_comments WHERE id=${id}::uuid FOR UPDATE`;
          before = await tx.reviewComment.findUniqueOrThrow({ where: { id } });
          if (before.status === 'DELETED')
            throw new ConflictException('Deleted content cannot be restored');
          after = await tx.reviewComment.update({
            where: { id },
            data: { status: status as any },
          });
        }
      }
      await this.audit(
        tx,
        adminId,
        kind === 'shops' ? 'SHOP' : kind === 'reviews' ? 'REVIEW' : 'COMMENT',
        id,
        dto.action === 'hide' ? 'HIDE' : 'RESTORE',
        dto.reason,
        { status: before.status },
        { status: after.status },
      );
      return { id, status: after.status };
    });
  }
  async merge(id: string, adminId: string, dto: MergeDto) {
    if (id === dto.targetId)
      throw new BadRequestException('Choose another shop');
    return this.db.$transaction(async (tx) => {
      await this.admin(tx, adminId);
      for (const key of [id, dto.targetId].sort())
        await tx.$queryRaw`SELECT id FROM shops WHERE id=${key}::uuid FOR UPDATE`;
      const source = await tx.shop.findUnique({ where: { id } }),
        target = await tx.shop.findUnique({ where: { id: dto.targetId } });
      if (!source || !target) throw new NotFoundException();
      if (source.status === 'MERGED' || target.status !== 'ACTIVE')
        throw new ConflictException('Merge into an active, unmerged shop');
      await tx.shopLink.updateMany({
        where: { shopId: id },
        data: { shopId: target.id },
      });
      await tx.review.updateMany({
        where: { shopId: id },
        data: { shopId: target.id },
      });
      // Reports keep their original target; the archived shop remains available to admins and redirects publicly.
      await tx.shop.update({
        where: { id },
        data: { status: 'MERGED', mergedIntoId: target.id },
      });
      await tx.shop.updateMany({
        where: { mergedIntoId: id },
        data: { mergedIntoId: target.id },
      });
      await this.audit(
        tx,
        adminId,
        'SHOP',
        id,
        'MERGE',
        dto.reason,
        { status: source.status },
        { status: 'MERGED', mergedIntoId: target.id },
      );
      return { id, mergedIntoId: target.id };
    });
  }
  async correct(id: string, adminId: string, dto: CorrectShopDto) {
    const links = dto.links?.map(normalizeShopLink);
    if (links && new Set(links.map((l) => l.identityKey)).size !== links.length)
      throw new BadRequestException('Duplicate links');
    try {
      return await this.db.$transaction(async (tx) => {
        await this.admin(tx, adminId);
        await tx.$queryRaw`SELECT id FROM shops WHERE id=${id}::uuid FOR UPDATE`;
        const before = await tx.shop.findUnique({
          where: { id },
          include: { links: true },
        });
        if (!before) throw new NotFoundException();
        if (before.status === 'MERGED')
          throw new ConflictException('Use the destination shop');
        if (links) {
          await tx.shopLink.deleteMany({ where: { shopId: id } });
          await tx.shopLink.createMany({
            data: links.map((l) => ({ ...l, shopId: id })),
          });
        }
        const after = await tx.shop.update({
          where: { id },
          data: { name: dto.name?.trim(), description: dto.description },
          include: { links: true },
        });
        await this.audit(
          tx,
          adminId,
          'SHOP',
          id,
          'CORRECT',
          dto.reason,
          {
            name: before.name,
            description: before.description,
            links: before.links,
          },
          {
            name: after.name,
            description: after.description,
            links: after.links,
          },
        );
        return after;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'This link belongs to another shop; merge instead',
        );
      throw error;
    }
  }
}
