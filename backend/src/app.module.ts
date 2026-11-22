import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import appConfig from './config/app.config';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { ShopsModule } from './shops/shops.module';

import { CategoriesModule } from './categories/categories.module';

import { ReviewsModule } from './reviews/reviews.module';

import { MediaModule } from './media/media.module';

import { FeedModule } from './feed/feed.module';

import { EngagementModule } from './engagement/engagement.module';

import { ReportsModule } from './reports/reports.module';

import { ModerationModule } from './moderation/moderation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: (config) => {
        if (
          typeof config.DATABASE_URL !== 'string' ||
          !config.DATABASE_URL.trim()
        ) {
          throw new Error('DATABASE_URL is required');
        }

        if (
          typeof config.JWT_SECRET !== 'string' ||
          config.JWT_SECRET.length < 32
        ) {
          throw new Error('JWT_SECRET must be at least 32 characters');
        }

        return config;
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    EventEmitterModule.forRoot(),

    ScheduleModule.forRoot(),

    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ModerationModule,
    ReportsModule,
    EngagementModule,
    FeedModule,
    MediaModule,
    ReviewsModule,
    CategoriesModule,
    ShopsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
