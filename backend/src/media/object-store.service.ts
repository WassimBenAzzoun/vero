import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ObjectStoreService {
  private readonly bucket = process.env.MEDIA_BUCKET || 'vero-reviews';
  private readonly supabase =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )
      : null;
  private readonly local =
    process.env.NODE_ENV !== 'production' && process.env.MEDIA_DRIVER === 's3'
      ? new S3Client({
          region: 'us-east-1',
          endpoint: process.env.MEDIA_ENDPOINT || 'http://127.0.0.1:9090',
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.MEDIA_ACCESS_KEY_ID || 'local',
            secretAccessKey: process.env.MEDIA_SECRET_ACCESS_KEY || 'local',
          },
        })
      : null;
  private initialized: Promise<void> | null = null;
  enabled() {
    return !!this.supabase || !!this.local;
  }
  private async bucketReady() {
    if (!this.enabled())
      throw new ServiceUnavailableException('Photo storage is not configured');
    if (!this.initialized)
      this.initialized = (async () => {
        if (this.supabase) {
          const { data, error } = await this.supabase.storage.getBucket(
            this.bucket,
          );
          if (!data) {
            const created = await this.supabase.storage.createBucket(
              this.bucket,
              {
                public: false,
                fileSizeLimit: 10485760,
                allowedMimeTypes: ['image/jpeg'],
              },
            );
            if (created.error && created.error.statusCode !== '409')
              throw created.error;
          } else if (error || data.public)
            throw new Error('Review bucket must be private');
        } else {
          try {
            await this.local!.send(
              new CreateBucketCommand({ Bucket: this.bucket }),
            );
          } catch (error) {
            if (
              !['BucketAlreadyExists', 'BucketAlreadyOwnedByYou'].includes(
                (error as Error).name,
              )
            )
              throw error;
          }
        }
      })().catch((error) => {
        this.initialized = null;
        throw error;
      });
    await this.initialized;
  }
  async put(key: string, bytes: Buffer) {
    try {
      await this.bucketReady();
      if (this.supabase) {
        const { error } = await this.supabase.storage
          .from(this.bucket)
          .upload(key, bytes, {
            contentType: 'image/jpeg',
            upsert: true,
            cacheControl: '0',
          });
        if (error) throw error;
      } else
        await this.local!.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: bytes,
            ContentType: 'image/jpeg',
          }),
        );
    } catch {
      throw new ServiceUnavailableException(
        'Photo storage is unavailable. Please retry.',
      );
    }
  }
  async get(key: string) {
    try {
      await this.bucketReady();
      if (this.supabase) {
        const { data, error } = await this.supabase.storage
          .from(this.bucket)
          .download(key);
        if (error || !data) throw error;
        return Buffer.from(await data.arrayBuffer());
      }
      const response = await this.local!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return Buffer.from(await response.Body!.transformToByteArray());
    } catch {
      throw new ServiceUnavailableException('Photo is temporarily unavailable');
    }
  }
  async remove(keys: string[]) {
    await this.bucketReady();
    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove(keys);
      if (error) throw new Error('Storage cleanup failed');
    } else
      await Promise.all(
        keys.map((Key) =>
          this.local!.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key }),
          ),
        ),
      );
  }
}
