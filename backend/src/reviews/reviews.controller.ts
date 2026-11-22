import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, EditReviewDto, ReviewQueryDto } from './reviews.dto';
@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Post('shops/:shopId/reviews') @ApiBearerAuth() create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(shopId, user.id, dto);
  }
  @OptionalAuth() @Get('shops/:shopId/reviews') list(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() query: ReviewQueryDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.reviews.list(shopId, query, user?.id);
  }
  @OptionalAuth() @Get('reviews/:id') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.reviews.detail(id, user?.id);
  }
  @Get('my/reviews') @ApiBearerAuth() mine(
    @Query() query: ReviewQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviews.list(undefined, query, user.id, true);
  }
  @Patch('reviews/:id') @ApiBearerAuth() edit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: EditReviewDto,
  ) {
    return this.reviews.edit(id, user.id, dto);
  }
  @Delete('reviews/:id') @ApiBearerAuth() remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviews.edit(id, user.id, {}, true);
  }
}
