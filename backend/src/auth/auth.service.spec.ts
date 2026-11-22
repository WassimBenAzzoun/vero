import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('test-jwt-token'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('should create a VIEWER user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'user-1',
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        isActive: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.register({
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'VIEWER',
          }),
        }),
      );

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should reject an existing email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.register({
          email: 'existing@example.com',
          fullName: 'Test User',
          password: 'Password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const passwordHash = await bcrypt.hash('Password123', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash,
        role: 'VIEWER',
        isActive: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should reject an incorrect password', async () => {
      const passwordHash = await bcrypt.hash('Password123', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        role: 'VIEWER',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject an inactive user', async () => {
      const passwordHash = await bcrypt.hash('Password123', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: false,
        role: 'VIEWER',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });
  });
});
