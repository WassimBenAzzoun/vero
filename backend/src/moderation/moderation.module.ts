import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

// Domain boundary; routes and services arrive in the corresponding feature task.
@Module({ controllers: [ModerationController], providers: [ModerationService] })
export class ModerationModule {}
