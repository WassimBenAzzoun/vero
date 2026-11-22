import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { visibleReview } from '../reviews/review-query';
import { ReportDto } from './reports.dto';
@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService) {}
  async create(userId: string, dto: ReportDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
      if (!(await tx.user.findFirst({ where: { id: userId, isActive: true } })))
        throw new UnauthorizedException();
      const exists =
        dto.targetType === 'shop'
          ? await tx.shop.findFirst({
              where: { id: dto.targetId, status: 'ACTIVE' },
            })
          : dto.targetType === 'review'
            ? await tx.review.findFirst({
                where: { id: dto.targetId, ...visibleReview },
              })
            : await tx.reviewComment.findFirst({
                where: {
                  id: dto.targetId,
                  status: 'PUBLISHED',
                  review: visibleReview,
                },
              });
      if (!exists) throw new NotFoundException();
      const target =
        dto.targetType === 'shop'
          ? { shopId: dto.targetId }
          : dto.targetType === 'review'
            ? { reviewId: dto.targetId }
            : { commentId: dto.targetId };
      const existing = await tx.report.findFirst({
        where: { reporterId: userId, status: 'OPEN', ...target },
        select: { id: true, status: true },
      });
      return (
        existing ||
        tx.report.create({
          data: {
            reporterId: userId,
            ...target,
            reason: dto.reason,
            details: dto.details,
          },
          select: { id: true, status: true },
        })
      );
    });
  }
}
