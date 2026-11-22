import { Prisma } from '../generated/prisma/client';

export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
export type SessionResult = {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};
