import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ModerationService } from '../src/moderation/moderation.service';
import { ReportsService } from '../src/reports/reports.service';
import { ReviewsService } from '../src/reviews/reviews.service';
import { ShopsService } from '../src/shops/shops.service';
import { EngagementService } from '../src/engagement/engagement.service';
export async function moderationScenarios(url: string) {
  const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    }),
    p = db as unknown as PrismaService;
  const mod = new ModerationService(p),
    reports = new ReportsService(p),
    reviews = new ReviewsService(p),
    shops = new ShopsService(p),
    engagement = new EngagementService(p);
  try {
    const admin = await db.user.findFirstOrThrow({
        where: { role: 'ADMIN', isActive: true },
      }),
      user = await db.user.findFirstOrThrow({
        where: { role: 'USER', isActive: true },
      });
    const source = (
      await shops.create(
        {
          name: 'Moderation source',
          links: [`https://source-${randomUUID()}.invalid`],
        },
        user.id,
      )
    ).shop;
    const target = (
      await shops.create(
        {
          name: 'Moderation target',
          links: [`https://target-${randomUUID()}.invalid`],
        },
        user.id,
      )
    ).shop;
    const review = await reviews.create(source.id, user.id, {
      rating: 5,
      text: 'Moderation fixture review',
      submissionId: randomUUID(),
    });
    const comment = await engagement.comment(
      review.id,
      user.id,
      'Visible reply',
    );
    const report = await reports.create(user.id, {
      targetType: 'review',
      targetId: review.id,
      reason: 'SPAM',
    });
    assert.equal((await reviews.detail(review.id)).id, review.id);
    await assert.rejects(
      mod.action('reviews', review.id, user.id, {
        action: 'hide',
        reason: 'Not admin',
      }),
    );
    await mod.action('reviews', review.id, admin.id, {
      action: 'hide',
      reason: 'Review fixture',
    });
    await assert.rejects(reviews.detail(review.id));
    assert.equal((await reviews.detail(review.id, user.id)).status, 'HIDDEN');
    assert.equal((await shops.profile(source.id)).reviewCount, 0);
    await mod.action('shops', source.id, admin.id, {
      action: 'hide',
      reason: 'Shop fixture',
    });
    await mod.action('shops', source.id, admin.id, {
      action: 'restore',
      reason: 'Restore shop only',
    });
    await assert.rejects(reviews.detail(review.id));
    await mod.action('reviews', review.id, admin.id, {
      action: 'restore',
      reason: 'Restore review',
    });
    assert.equal((await shops.profile(source.id)).reviewCount, 1);
    await mod.action('comments', comment.id, admin.id, {
      action: 'hide',
      reason: 'Comment fixture',
    });
    assert.equal(
      (await engagement.comments(review.id, { limit: 20 })).items.length,
      0,
    );
    await mod.action('comments', comment.id, admin.id, {
      action: 'restore',
      reason: 'Restore comment',
    });
    await mod.merge(source.id, admin.id, {
      targetId: target.id,
      reason: 'Duplicate fixture',
    });
    assert.equal((await shops.profile(source.id)).id, target.id);
    assert.equal((await reviews.detail(review.id)).shop.id, target.id);
    assert.equal((await shops.profile(target.id)).reviewCount, 1);
    assert.equal(
      (await db.report.findUniqueOrThrow({ where: { id: report.id } }))
        .reviewId,
      review.id,
    );
    await assert.rejects(
      mod.merge(target.id, admin.id, {
        targetId: source.id,
        reason: 'Cycle denied',
      }),
    );
    const targetLinks = await db.shopLink.findMany({
      where: { shopId: target.id },
    });
    await assert.rejects(
      mod.correct(target.id, admin.id, {
        name: 'Broken',
        links: ['https://instagram.com/p/post'],
        reason: 'Invalid link',
      }),
    );
    assert.equal(
      (await db.shopLink.findMany({ where: { shopId: target.id } })).length,
      targetLinks.length,
    );
    await mod.correct(target.id, admin.id, {
      name: 'Corrected fixture',
      reason: 'Name correction',
    });
    await mod.action('reports', report.id, admin.id, {
      action: 'resolve',
      reason: 'Handled report',
    });
    const session = await db.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await mod.action('members', user.id, admin.id, {
      action: 'suspend',
      reason: 'Suspension fixture',
    });
    assert.ok(
      (await db.session.findUniqueOrThrow({ where: { id: session.id } }))
        .revokedAt,
    );
    await assert.rejects(
      engagement.comment(review.id, user.id, 'Denied reply'),
    );
    await mod.action('members', user.id, admin.id, {
      action: 'reactivate',
      reason: 'Reactivate fixture',
    });
    await assert.rejects(
      mod.action('members', admin.id, admin.id, {
        action: 'suspend',
        reason: 'Self lockout denied',
      }),
    );
    assert.ok(
      (await db.moderationAction.count({ where: { adminId: admin.id } })) >= 10,
    );
    console.log(
      'PASS moderation: post-publication reports, admin permission, rating/parent visibility, comment hide/restore, atomic merge/redirect/cycle rejection, audit and session revocation',
    );
  } finally {
    await db.$disconnect();
  }
}

