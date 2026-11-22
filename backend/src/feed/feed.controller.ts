import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FeedQueryDto } from '../reviews/reviews.dto';
import { FeedService } from './feed.service';
@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}
  @Get() @OptionalAuth() list(
    @Query() query: FeedQueryDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.feed.list(query, user?.id);
  }
}
