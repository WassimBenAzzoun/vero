import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStoreService } from './object-store.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly prisma: PrismaService,
    readonly store: ObjectStoreService,
  ) {}
  async intent(userId: string) {
    if (!this.store.enabled())
      throw new ServiceUnavailableException('Photo storage is not configured');
    const id = randomUUID();
    await this.prisma.mediaAsset.create({
      data: {
        id,
        uploaderId: userId,
        storageKey: `reviews/${userId}/${id}.jpg`,
        thumbnailKey: `reviews/${userId}/${id}-thumb.jpg`,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return {
      id,
      uploadPath: `/media/uploads/${id}/content`,
      completePath: `/media/uploads/${id}/complete`,
    };
  }
  async upload(id: string, userId: string, file?: Express.Multer.File) {
    if (!file?.buffer?.length || file.size > 10485760)
      throw new BadRequestException('Choose a photo smaller than 10 MB');
    let bytes: Buffer;
    let thumb: Buffer;
    let width: number;
    let height: number;
    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 24000000,
        failOn: 'error',
      });
      const metadata = await image.metadata();
      if (
        !['jpeg', 'png', 'webp', 'heif'].includes(metadata.format || '') ||
        (metadata.pages || 1) > 1
      )
        throw new Error();
      const normalized = await image
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      bytes = normalized.data;
      width = normalized.info.width;
      height = normalized.info.height;
      thumb = await sharp(bytes)
        .resize({
          width: 480,
          height: 480,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 75 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Unsupported or damaged photo. Convert HEIC photos to JPEG and retry.',
      );
    }
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        if (!(await tx.user.findUnique({ where: { id: userId } }))?.isActive)
          throw new UnauthorizedException();
        await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${id}::uuid FOR UPDATE`;
        const asset = await tx.mediaAsset.findUnique({ where: { id } });
        if (
          !asset ||
          asset.uploaderId !== userId ||
          !['PENDING', 'READY'].includes(asset.status) ||
          (asset.expiresAt && asset.expiresAt <= new Date())
        )
          throw new NotFoundException('Upload not found');
        if (asset.status !== 'READY') {
          await this.store.put(asset.storageKey, bytes);
          await this.store.put(asset.thumbnailKey!, thumb);
          await tx.mediaAsset.update({
            where: { id },
            data: {
              status: 'READY',
              mimeType: 'image/jpeg',
              byteSize: BigInt(bytes.length),
              width,
              height,
            },
          });
        }
        return { id, ready: true };
      },
      { timeout: 20000 },
    );
  }
  async complete(id: string, userId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        id,
        uploaderId: userId,
        status: 'READY',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, width: true, height: true, mimeType: true },
    });
    if (!asset)
      throw new BadRequestException('Photo is not ready. Retry the upload.');
    return { ...asset, ready: true };
  }
  async read(id: string, thumbnail: boolean) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        id,
        status: 'READY',
        reviewImage: {
          review: { status: 'PUBLISHED', shop: { status: 'ACTIVE' } },
        },
      },
      select: { storageKey: true, thumbnailKey: true },
    });
    if (!asset) throw new NotFoundException('Photo not found');
    return this.store.get(
      thumbnail && asset.thumbnailKey ? asset.thumbnailKey : asset.storageKey,
    );
  }
  @Cron(CronExpression.EVERY_HOUR)
  async cleanup() {
    if (!this.store.enabled()) return;
    const candidates = await this.prisma.mediaAsset.findMany({
      where: {
        expiresAt: { lte: new Date() },
        logos: { none: {} },
        OR: [
          { reviewImage: null },
          { status: 'DELETED', reviewImage: { review: { status: 'DELETED' } } },
        ],
      },
      take: 100,
      select: { id: true },
    });
    for (const { id } of candidates)
      try {
        const retired = await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM media_assets WHERE id = ${id}::uuid FOR UPDATE`;
          const asset = await tx.mediaAsset.findFirst({
            where: {
              id,
              expiresAt: { lte: new Date() },
              logos: { none: {} },
              OR: [
                { reviewImage: null },
                {
                  status: 'DELETED',
                  reviewImage: { review: { status: 'DELETED' } },
                },
              ],
            },
          });
          if (!asset) return null;
          await tx.mediaAsset.update({
            where: { id },
            data: { status: 'DELETED' },
          });
          return asset;
        });
        if (retired) {
          await this.store.remove([
            retired.storageKey,
            ...(retired.thumbnailKey ? [retired.thumbnailKey] : []),
          ]);
          await this.prisma.mediaAsset.update({
            where: { id },
            data: { expiresAt: null },
          });
        }
      } catch {
        this.logger.warn('A media cleanup will be retried');
      }
  }
}
