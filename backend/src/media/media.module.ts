import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { ObjectStoreService } from './object-store.service';
import { MediaController } from './media.controller';

@Module({
  providers: [MediaService, ObjectStoreService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
