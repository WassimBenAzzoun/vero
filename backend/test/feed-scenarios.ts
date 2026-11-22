import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { FeedService, trendingScore } from '../src/feed/feed.service';
import { EngagementService } from '../src/engagement/engagement.service';
export async function feedScenarios(url: string) {
  const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    }),
    prisma = db as unknown as PrismaService;
  const feed = new FeedService(prisma),
    engagement = new EngagementService(prisma);
  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      take: 2,
    });
    const shop = await db.shop.create({
      data: {
        name: 'Feed fixture',
        slug: randomUUID(),
        createdById: users[0].id,
      },
    });
    const review = await db.review.create({
      data: {
        shopId: shop.id,
        authorId: users[0].id,
        submissionId: randomUUID(),
        submissionHash: 'test',
        rating: 5,
        text: 'Feed fixture review',
      },
    });
    await Promise.all([
      engagement.like(review.id, users[1].id, true),
      engagement.like(review.id, users[1].id, true),
    ]);
    assert.equal(
      await db.reviewLike.count({ where: { reviewId: review.id } }),
      1,
    );
    const comment = await engagement.comment(
      review.id,
      users[1].id,
      'First reply',
    );
    await engagement.comment(review.id, users[1].id, 'Second reply');
    await assert.rejects(engagement.edit(comment.id, users[0].id, 'spoof'));
    const first = await feed.list({ sort: 'trending', limit: 1 });
    assert.equal(first.items[0].id, review.id);
    const entry = await db.feedSnapshotEntry.findFirstOrThrow({
      where: { reviewId: review.id },
      include: { snapshot: true },
    });
    const expected = trendingScore(
      1,
      1,
      (entry.snapshot.createdAt.getTime() - review.createdAt.getTime()) /
        3600000,
    );
    assert.ok(Math.abs(entry.score - expected) < 0.01);
    await engagement.like(review.id, users[0].id, true); // Author activity cannot inflate ranking.
    await db.user.update({
      where: { id: users[1].id },
      data: { isActive: false },
    });
    await feed.list({ sort: 'trending', limit: 20 });
    const latestSnapshot = await db.feedSnapshot.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    assert.equal(
      (
        await db.feedSnapshotEntry.findFirstOrThrow({
          where: { snapshotId: latestSnapshot.id, reviewId: review.id },
        })
      ).score,
      0,
    );
    await db.user.update({
      where: { id: users[1].id },
      data: { isActive: true },
    });
    const latest = await feed.list({ sort: 'latest', limit: 1 });
    await db.review.create({
      data: {
        shopId: shop.id,
        authorId: users[0].id,
        submissionId: randomUUID(),
        submissionHash: 'test2',
        rating: 4,
        text: 'New review between pages',
      },
    });
    const next = await feed.list({
      sort: 'latest',
      limit: 20,
      cursor: latest.nextCursor!,
    });
    assert.ok(!next.items.some((row) => row.id === latest.items[0].id));
    if (first.nextCursor) {
      const page = await feed.list({
        sort: 'trending',
        limit: 20,
        cursor: first.nextCursor,
      });
      assert.ok(!page.items.some((row) => row.id === review.id));
    }
    await db.review.update({
      where: { id: review.id },
      data: { status: 'HIDDEN' },
    });
    await assert.rejects(engagement.comment(review.id, users[1].id, 'blocked'));
    await assert.rejects(engagement.comments(review.id, {}));
    assert.ok(
      !(await feed.list({ sort: 'latest', limit: 100 })).items.some(
        (row) => row.id === review.id,
      ),
    );
    await db.feedSnapshot.updateMany({ data: { createdAt: new Date(0), expiresAt: new Date(1000) } });
    if (first.nextCursor)
      await assert.rejects(
        feed.list({ sort: 'trending', limit: 20, cursor: first.nextCursor }),
      );
    console.log(
      'PASS feed/engagement: idempotent likes, comment ownership, distinct ranking, inactive/author exclusions, stable cursors, expiry and hidden parents',
    );
  } finally {
    await db.$disconnect();
  }
}
