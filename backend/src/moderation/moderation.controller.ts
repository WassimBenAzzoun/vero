import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ActionDto,
  AdminListDto,
  CorrectShopDto,
  MergeDto,
} from './moderation.dto';
import { type AdminKind, ModerationService } from './moderation.service';
import { IsIn, IsUUID } from 'class-validator';
class ListParams {
  @IsIn(['reports', 'reviews', 'comments', 'shops', 'members', 'history'])
  kind: AdminKind;
}
class ActionParams {
  @IsIn(['reports', 'reviews', 'comments', 'shops', 'members']) kind: Exclude<
    AdminKind,
    'history'
  >;
  @IsUUID() id: string;
}
@ApiTags('Moderation')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class ModerationController {
  constructor(private readonly service: ModerationService) {}
  @Get(':kind') list(
    @Param() params: ListParams,
    @Query() query: AdminListDto,
  ) {
    return this.service.list(params.kind, query);
  }
  @Post(':kind/:id/actions') action(
    @Param() params: ActionParams,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ActionDto,
  ) {
    return this.service.action(params.kind, id, user.id, dto);
  }
  @Post('shops/:id/merge') merge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: MergeDto,
  ) {
    return this.service.merge(id, user.id, dto);
  }
  @Patch('shops/:id') correct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CorrectShopDto,
  ) {
    return this.service.correct(id, user.id, dto);
  }
}
