import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ObjectStoreService } from '../src/media/object-store.service';
import { MediaService } from '../src/media/media.service';
import { ReviewsService } from '../src/reviews/reviews.service';
import { ShopsService } from '../src/shops/shops.service';
export async function reviewScenarios(url: string) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const prisma = db as unknown as PrismaService;
  const previous = {
    driver: process.env.MEDIA_DRIVER,
    endpoint: process.env.MEDIA_ENDPOINT,
  };
  process.env.MEDIA_DRIVER = 's3';
  process.env.MEDIA_ENDPOINT = 'http://127.0.0.1:9090';
  const store = new ObjectStoreService(),
    media = new MediaService(prisma, store),
    reviews = new ReviewsService(prisma),
    shops = new ShopsService(prisma);
  const keys: string[] = [];
  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      take: 2,
    });
    assert.equal(users.length, 2);
    const shop = (
      await shops.create(
        {
          name: 'Photo review fixture',
          links: [`https://photos-${randomUUID()}.invalid/`],
        },
        users[0].id,
      )
    ).shop;
    const intent = await media.intent(users[0].id);
    const asset = await db.mediaAsset.findUniqueOrThrow({
      where: { id: intent.id },
    });
    keys.push(asset.storageKey, asset.thumbnailKey!);
    const bytes = await sharp({
      create: { width: 640, height: 320, channels: 3, background: '#27D17F' },
    })
      .jpeg()
      .withExif({ IFD0: { Artist: 'Private metadata' } })
      .toBuffer();
    const file = {
      buffer: bytes,
      size: bytes.length,
      mimetype: 'image/jpeg',
    } as Express.Multer.File;
    await assert.rejects(
      media.upload(intent.id, users[0].id, {
        ...file,
        buffer: Buffer.from('<svg></svg>'),
        size: 11,
      }),
    );
    await assert.rejects(media.upload(intent.id, users[1].id, file));
    await media.upload(intent.id, users[0].id, file);
    await media.complete(intent.id, users[0].id);
    const normalized = await store.get(asset.storageKey);
    assert.equal((await sharp(normalized).metadata()).exif, undefined);
    await assert.rejects(media.read(intent.id, false));
    const dto = {
      submissionId: randomUUID(),
      rating: 5,
      text: 'A real integration fixture review with a photo.',
      imageIds: [intent.id],
    };
    await assert.rejects(reviews.create(shop.id, users[1].id, dto));
    const [first, retry] = await Promise.all([
      reviews.create(shop.id, users[0].id, dto),
      reviews.create(shop.id, users[0].id, dto),
    ]);
    assert.equal(first.id, retry.id);
    assert.ok((await media.read(intent.id, false)).length > 0);
    await assert.rejects(
      reviews.create(shop.id, users[0].id, {
        ...dto,
        text: 'Changed payload for the same submission.',
      }),
    );
    const second = await reviews.create(shop.id, users[0].id, {
      ...dto,
      submissionId: randomUUID(),
      rating: 3,
      imageIds: [],
      text: 'A second deliberate review from the same account.',
    });
    assert.notEqual(second.id, first.id);
    assert.equal((await shops.profile(shop.id)).averageRating, 4);
    await assert.rejects(reviews.edit(first.id, users[1].id, { rating: 1 }));
    const edited = await reviews.edit(first.id, users[0].id, { rating: 2 });
    assert.equal(edited.createdAt.getTime(), first.createdAt.getTime());
    assert.equal((await shops.profile(shop.id)).averageRating, 2.5);
    await db.review.update({
      where: { id: first.id },
      data: { status: 'HIDDEN' },
    });
    await assert.rejects(media.read(intent.id, false));
    await assert.rejects(reviews.detail(first.id));
    assert.equal(
      (await reviews.detail(first.id, users[0].id)).status,
      'HIDDEN',
    );
    assert.equal((await shops.profile(shop.id)).reviewCount, 1);
    await reviews.edit(first.id, users[0].id, {
      text: 'Edited while hidden without restoring publication.',
    });
    assert.equal(
      (await db.review.findUniqueOrThrow({ where: { id: first.id } })).status,
      'HIDDEN',
    );
    await reviews.edit(first.id, users[0].id, {}, true);
    assert.equal(
      (await db.review.findUniqueOrThrow({ where: { id: first.id } })).status,
      'DELETED',
    );
    assert.equal((await reviews.list(shop.id, { limit: 20 })).items.length, 1);
    console.info(
      'PASS reviews/media: byte validation, metadata stripping, ownership, idempotent/concurrent publication, repeated reviews, rating edits, hidden visibility and deletion',
    );
  } finally {
    if (keys.length) await store.remove(keys).catch(() => console.warn('Local fixture object cleanup will be retried'));
    await db.$disconnect();
    if(previous.driver===undefined)delete process.env.MEDIA_DRIVER;else process.env.MEDIA_DRIVER=previous.driver;
    if(previous.endpoint===undefined)delete process.env.MEDIA_ENDPOINT;else process.env.MEDIA_ENDPOINT=previous.endpoint;
  }
}
