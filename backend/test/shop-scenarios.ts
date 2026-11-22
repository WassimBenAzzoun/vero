import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ShopsService } from '../src/shops/shops.service';
export async function shopScenarios(url: string) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const shops = new ShopsService(db as unknown as PrismaService);
  try {
    const actors = await db.user.findMany({
      where: { isActive: true },
      take: 2,
    });
    assert.equal(actors.length, 2);
    const race = await Promise.all(
      actors.map((user) =>
        shops.create(
          {
            name: 'Same Name',
            links: ['https://www.instagram.com/concurrent.shop/?igsh=x'],
          },
          user.id,
        ),
      ),
    );
    assert.equal(race.filter((r) => r.created).length, 1);
    assert.equal(race[0].shop.id, race[1].shop.id);
    assert.equal(
      (await shops.search({ q: 'instagram.com/CONCURRENT.SHOP', limit: 20 }))
        .items[0].id,
      race[0].shop.id,
    );
    const separate = await shops.create(
      { name: 'Same Name', links: ['https://example.invalid/another-store'] },
      actors[0].id,
    );
    assert.notEqual(separate.shop.id, race[0].shop.id);
    const first = await shops.search({ q: 'Same Name', limit: 1 });
    assert.ok(first.nextCursor);
    const second = await shops.search({
      q: 'Same Name',
      limit: 1,
      cursor: first.nextCursor!,
    });
    assert.notEqual(first.items[0].id, second.items[0].id);
    await assert.rejects(
      shops.search({ q: 'changed', limit: 1, cursor: first.nextCursor! }),
    );
    const reviewId = randomUUID();
    await db.review.create({
      data: {
        id: reviewId,
        authorId: actors[0].id,
        shopId: separate.shop.id,
        submissionId: randomUUID(),
        submissionHash: 'fixture',
        rating: 5,
        text: 'A sufficiently long fixture review.',
      },
    });
    await db.review.create({
      data: {
        authorId: actors[0].id,
        shopId: separate.shop.id,
        submissionId: randomUUID(),
        submissionHash: 'fixture2',
        rating: 1,
        text: 'Hidden fixture review never counts.',
        status: 'HIDDEN',
      },
    });
    const rated = await shops.profile(separate.shop.id);
    assert.equal(rated.reviewCount, 1);
    assert.equal(rated.averageRating, 5);
    assert.equal(rated.starDistribution[5], 1);
    await db.review.update({
      where: { id: reviewId },
      data: { status: 'HIDDEN' },
    });
    assert.equal((await shops.profile(separate.shop.id)).averageRating, null);
    await db.shop.update({
      where: { id: separate.shop.id },
      data: { status: 'HIDDEN' },
    });
    await assert.rejects(shops.profile(separate.shop.id));
    assert.equal(
      (
        await shops.search({
          q: 'https://example.invalid/another-store',
          limit: 20,
        })
      ).items.length,
      0,
    );
    await assert.rejects(
      shops.create(
        {
          name: 'Hidden duplicate',
          links: ['https://example.invalid/another-store'],
        },
        actors[0].id,
      ),
    );
    const alt = await shops.create(
      {
        name: 'Ignored name',
        links: [
          'https://instagram.com/concurrent.shop/',
          'https://example.invalid/unapproved-alias',
        ],
      },
      actors[0].id,
    );
    assert.equal(alt.created, false);
    assert.equal(
      await db.shopLink.count({
        where: {
          identityKey: 'website:https://example.invalid/unapproved-alias',
        },
      }),
      0,
    );
    console.info(
      'PASS shops: canonical search, concurrent duplicate creation, separate same-name shops, cursors, visible-only ratings and alternate-link protection',
    );
  } finally {
    await db.$disconnect();
  }
}
