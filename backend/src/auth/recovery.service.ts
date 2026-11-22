import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { tokenHash } from './sessions.service';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  constructor(private readonly prisma: PrismaService) {}
  async request(email: string) {
    if (
      !process.env.SMTP_HOST ||
      !process.env.PASSWORD_RESET_URL ||
      !process.env.MAIL_FROM
    )
      throw new ServiceUnavailableException(
        'Password recovery is not configured',
      );
    const generic = {
      message:
        'If this account supports password recovery, an email has been sent.',
    };
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.isActive || !user.passwordHash) return generic;
    const token = randomBytes(48).toString('base64url');
    const row = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    });
    const url = new URL(process.env.PASSWORD_RESET_URL);
    url.hash = `token=${token}`; // Avoid reset tokens in access logs/referrers.
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          }
        : {}),
      connectionTimeout: 5000,
      socketTimeout: 5000,
    });
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: 'Vero - Réinitialiser votre mot de passe',
        text: `Réinitialisez votre mot de passe dans les 30 minutes :\n${url.toString()}\nIgnorez cet email si vous n’avez pas fait cette demande.`,
      });
    } catch {
      await this.prisma.passwordResetToken.delete({ where: { id: row.id } });
      this.logger.error('Recovery email delivery failed'); // No token/address in logs.
    } finally {
      transport.close();
    }
    return generic;
  }
  async reset(token: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    const ok = await this.prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash: tokenHash(token) },
        include: { user: true },
      });
      if (
        !record ||
        record.consumedAt ||
        record.expiresAt <= new Date() ||
        !record.user.isActive ||
        !record.user.passwordHash
      )
        return false;
      // Lock the user first: resets/password changes and account deletion serialize.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${record.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: record.userId } });
      if (!user?.isActive || !user.passwordHash) return false;
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (!claimed.count) return false;
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    });
    if (!ok) throw new BadRequestException('Invalid or expired reset link');
    return { message: 'Password updated. Please sign in.' };
  }
}
