import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';

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
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'email',
      'fullName',
      'role',
    ] as const;

    type SortField = (typeof allowedSortFields)[number];

    const sortBy: SortField = allowedSortFields.includes(
      query.sortBy as SortField,
    )
      ? (query.sortBy as SortField)
      : 'createdAt';

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, adminId: string) {
    await this.findOne(id);

    if (id === adminId) {
      if (dto.role !== undefined && dto.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'You cannot demote your own administrator account',
        );
      }

      if (dto.isActive === false) {
        throw new ForbiddenException(
          'You cannot deactivate your own administrator account',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
      const user = await tx.user.update({
        where: { id },
        data: dto,
        select: userSelect,
      });
      if (dto.isActive === false)
        await tx.session.updateMany({
          where: { userId: id },
          data: { revokedAt: new Date() },
        });
      return user;
    });
  }

  async remove(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException(
        'You cannot deactivate your own administrator account',
      );
    }

    await this.findOne(id);

    return this.update(id, { isActive: false }, adminId);
  }
}
