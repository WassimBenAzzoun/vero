import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SessionsService } from './sessions.service';
import { GoogleService } from './google.service';
import { safeUserSelect } from './auth.types';
import { DeleteAccountDto } from './dto/session.dto';

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hash('constant-time-dummy-password', 12);
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly google: GoogleService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            fullName: dto.fullName.trim(),
            passwordHash,
            role: 'USER',
          },
          select: safeUserSelect,
        });
        return this.sessions.create(user, tx);
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { ...safeUserSelect, passwordHash: true },
    });
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user?.isActive || !user.passwordHash || !valid)
      throw new UnauthorizedException('Invalid credentials');
    const { passwordHash: _passwordHash, ...safe } = user;
    return this.sessions.create(safe);
  }
  async googleLogin(idToken: string) {
    const credential = await this.google.verify(idToken);
    const existing = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: 'GOOGLE',
          providerSubject: credential.subject,
        },
      },
      include: { user: { select: safeUserSelect } },
    });
    if (existing) {
      if (!existing.user.isActive)
        throw new UnauthorizedException('Invalid or inactive account');
      return this.sessions.create(existing.user);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: credential.email,
            fullName: credential.fullName,
            identities: {
              create: {
                provider: 'GOOGLE',
                providerSubject: credential.subject,
              },
            },
          },
          select: safeUserSelect,
        });
        return this.sessions.create(user, tx);
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const winner = await this.prisma.authIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'GOOGLE',
            providerSubject: credential.subject,
          },
        },
        include: { user: { select: safeUserSelect } },
      });
      if (winner?.user.isActive) return this.sessions.create(winner.user);
      throw new ConflictException({
        code: 'ACCOUNT_LINK_REQUIRED',
        message: 'Sign in to your existing account to link Google.',
      });
    }
  }
  async linkGoogle(userId: string, idToken: string, password?: string) {
    const credential = await this.google.verify(idToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException();
    if (
      !user.passwordHash ||
      !password ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new UnauthorizedException(
        'Confirm your current password to link Google',
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current?.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException();
      const identity = await tx.authIdentity.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'GOOGLE',
            providerSubject: credential.subject,
          },
        },
      });
      if (identity && identity.userId !== userId)
        throw new ConflictException('Google account already linked');
      if (!identity)
        await tx.authIdentity.create({
          data: {
            userId,
            provider: 'GOOGLE',
            providerSubject: credential.subject,
          },
        });
    });
    return { message: 'Google account linked' };
  }
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
    if (!user?.isActive) throw new UnauthorizedException();
    return user;
  }
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.getProfile(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: safeUserSelect,
    });
  }
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user?.isActive ||
      !user.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    )
      throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current?.isActive || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException();
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    });
    return { message: 'Password changed. Please sign in.' };
  }
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { identities: true },
    });
    if (!user?.isActive) throw new UnauthorizedException();
    if (user.role === 'ADMIN')
      throw new ConflictException(
        'Administrators must transfer access before deleting their account',
      );
    if (user.passwordHash) {
      if (
        !dto.currentPassword ||
        !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
      )
        throw new UnauthorizedException('Confirm your password');
    } else {
      if (!dto.idToken) throw new UnauthorizedException('Confirm with Google');
      const google = await this.google.verify(dto.idToken);
      if (
        !user.identities.some(
          (identity) => identity.providerSubject === google.subject,
        )
      )
        throw new UnauthorizedException();
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (
        !current?.isActive ||
        current.role !== 'USER' ||
        current.passwordHash !== user.passwordHash
      )
        throw new UnauthorizedException();
      await tx.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.authIdentity.deleteMany({ where: { userId } });
      await tx.review.updateMany({
        where: { authorId: userId },
        data: { status: 'DELETED', deletedAt: new Date() },
      });
      await tx.reviewComment.updateMany({
        where: { authorId: userId },
        data: { status: 'DELETED', deletedAt: new Date() },
      });
      await tx.mediaAsset.updateMany({
        where: { uploaderId: userId },
        data: { status: 'DELETED', expiresAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${randomUUID()}@vero.invalid`,
          fullName: 'Deleted account',
          avatarUrl: null,
          passwordHash: null,
          isActive: false,
          deletedAt: new Date(),
        },
      });
    });
    return { message: 'Account deleted' };
  }
}
