import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
import { CommentDto } from './engagement.dto';
import { EngagementService } from './engagement.service';
@ApiTags('Engagement')
@Controller()
export class EngagementController {
  constructor(private readonly service: EngagementService) {}
  @Put('reviews/:id/like')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  like(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.like(id, user.id, true);
  }
  @Delete('reviews/:id/like') unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.like(id, user.id, false);
  }
  @Public() @Get('reviews/:id/comments') comments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CursorQueryDto,
  ) {
    return this.service.comments(id, query);
  }
  @Post('reviews/:id/comments')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  comment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CommentDto,
  ) {
    return this.service.comment(id, user.id, dto.text);
  }
  @Patch('comments/:id') edit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CommentDto,
  ) {
    return this.service.edit(id, user.id, dto.text);
  }
  @Delete('comments/:id') remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.edit(id, user.id);
  }
}
