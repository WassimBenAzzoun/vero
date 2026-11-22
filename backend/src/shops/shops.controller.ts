import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ShopsService } from './shops.service';
import { CreateShopDto, ShopSearchDto } from './shops.dto';
@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}
  @Public()
  @Get()
  @ApiOperation({ summary: 'Search active shops by name, handle or page link' })
  search(@Query() query: ShopSearchDto) {
    return this.shops.search(query);
  }
  @Public()
  @Get(':id')
  profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.shops.profile(id);
  }
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a shop or return the existing link match' })
  async create(
    @Body() dto: CreateShopDto,
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.shops.create(dto, user.id);
    response.status(result.created ? 201 : 200);
    return result;
  }
}
