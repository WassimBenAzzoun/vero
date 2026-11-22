import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

// Domain boundary; routes and services arrive in the corresponding feature task.
@Module({ controllers: [FeedController], providers: [FeedService] })
export class FeedModule {}
