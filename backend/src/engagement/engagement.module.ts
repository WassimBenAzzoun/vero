import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

// Domain boundary; routes and services arrive in the corresponding feature task.
@Module({ controllers: [EngagementController], providers: [EngagementService] })
export class EngagementModule {}
