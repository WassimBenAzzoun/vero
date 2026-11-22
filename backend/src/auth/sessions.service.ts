import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { safeUserSelect, type SafeUser } from './auth.types';

export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async create(
    user: SafeUser,
    tx?: Prisma.TransactionClient,
  ): Promise<{ user: SafeUser; refreshToken: string; accessToken: string }> {
    if (!tx)
      return this.prisma.$transaction((transaction) =>
        this.create(user, transaction),
      );
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
    const active = await tx.user.findUnique({
      where: { id: user.id },
      select: safeUserSelect,
    });
    if (!active?.isActive) throw new UnauthorizedException();
    user = active;
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
    const session = await tx.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: tokenHash(refreshToken),
        expiresAt: new Date(
          Date.now() +
            (Number.isFinite(days) && days > 0 ? days : 30) * 86400000,
        ),
      },
    });
    return {
      user,
      refreshToken,
      accessToken: await this.jwt.signAsync({ sub: user.id, sid: session.id }),
    };
  }

  async refresh(raw: string) {
    const owner = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash(raw) },
      select: { userId: true },
    });
    if (!owner) throw new UnauthorizedException('Invalid or expired session');
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${owner.userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM sessions WHERE refresh_token_hash = ${tokenHash(raw)} FOR UPDATE`;
      const session = await tx.session.findUnique({
        where: { refreshTokenHash: tokenHash(raw) },
        include: { user: { select: safeUserSelect } },
      });
      if (!session) return null;
      if (
        session.consumedAt ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        !session.user.isActive
      ) {
        await tx.session.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null; // Commit revocation before rejecting reuse.
      }
      const refreshToken = randomBytes(48).toString('base64url');
      const next = await tx.session.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: tokenHash(refreshToken),
          expiresAt: session.expiresAt,
        },
      });
      await tx.session.update({
        where: { id: session.id },
        data: { consumedAt: new Date(), replacementId: next.id },
      });
      return {
        user: session.user,
        refreshToken,
        accessToken: await this.jwt.signAsync({
          sub: session.userId,
          sid: next.id,
        }),
      };
    });
    if (!result) throw new UnauthorizedException('Invalid or expired session');
    return result;
  }

  async logout(raw: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash(raw) },
    });
    if (session)
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId },
        data: { revokedAt: new Date() },
      });
    return { message: 'Signed out' };
  }
}
