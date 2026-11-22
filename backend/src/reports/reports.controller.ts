import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportDto } from './reports.dto';
import { ReportsService } from './reports.service';
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Post() @Throttle({ default: { limit: 10, ttl: 60000 } }) create(
    @CurrentUser() user: { id: string },
    @Body() dto: ReportDto,
  ) {
    return this.service.create(user.id, dto);
  }
}
