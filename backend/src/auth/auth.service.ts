import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { Role } from '../generated/prisma/client';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hash('constant-time-dummy-password', 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: Role.USER,
      },
      select: userSelect,
    });

    const accessToken = await this.generateToken(user);

    return { user, accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { ...userSelect, passwordHash: true },
    });

    const hash = user?.passwordHash ?? (await this.dummyHash);

    const passwordMatches = await bcrypt.compare(dto.password, hash);

    if (!user || !user.isActive || !user.passwordHash || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    const accessToken = await this.generateToken(user);

    return {
      user: safeUser,
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user?.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.getProfile(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: userSelect,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.isActive || !user.passwordHash) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }
}
