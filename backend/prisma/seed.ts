import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Seed requires NODE_ENV=development; production seeding is disabled',
    );
  }
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12
  ) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters) explicitly',
    );
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (
      existing &&
      (existing.role !== 'ADMIN' || !existing.isActive || existing.deletedAt)
    ) {
      throw new Error(
        'Seed will not elevate or reactivate an existing account',
      );
    }
    await prisma.user.upsert({
      where: { email },
      update: {}, // Re-running a seed must not reset credentials or profile fields.
      create: {
        email,
        fullName: 'Vero Development Admin',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    if (process.env.SEED_DEMO_DATA !== 'true') {
      console.info('Development admin ready. Demo data disabled.');
      return;
    }
    // Fixed demo IDs make repeated runs idempotent. All visible copy is labeled fictional.
    await prisma.$transaction(async (tx) => {
      const author = await tx.user.upsert({
        where: { email: 'demo-buyer@vero.invalid' },
        update: {},
        create: {
          id: '10000000-0000-4000-8000-000000000010',
          email: 'demo-buyer@vero.invalid',
          fullName: 'DEMO Buyer',
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
        },
      });
      const category = await tx.category.upsert({
        where: { key: 'fashion' },
        update: {},
        create: { key: 'fashion', labelFr: 'Mode', labelAr: 'أزياء' },
      });
      const shopId = '20000000-0000-4000-8000-000000000010';
      await tx.shop.upsert({
        where: { id: shopId },
        update: {},
        create: {
          id: shopId,
          name: 'DEMO Boutique - fictional',
          slug: 'demo-boutique-fictional',
          description: 'Fictional development example. Not a real seller.',
          governorate: 'Sousse',
          createdById: author.id,
          categoryId: category.id,
          links: {
            create: {
              platform: 'WEBSITE',
              originalUrl: 'https://shop.vero.invalid',
              normalizedUrl: 'https://shop.vero.invalid/',
              identityKey: 'website:https://shop.vero.invalid/',
            },
          },
        },
      });
      for (const [index, text] of [
        'DEMO review: fictional purchase for testing the Vero interface.',
        'DEMO second review: the same buyer can review this shop again.',
      ].entries()) {
        const id = `30000000-0000-4000-8000-00000000001${index}`;
        await tx.review.upsert({
          where: { id },
          update: {},
          create: {
            id,
            authorId: author.id,
            shopId,
            submissionId: id,
            submissionHash: createHash('sha256').update(text).digest('hex'),
            rating: index === 0 ? 5 : 4,
            text,
            productName: 'DEMO Product',
          },
        });
      }
    });
    console.info(
      'Development seed ready: admin and explicitly fictional demo content.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
