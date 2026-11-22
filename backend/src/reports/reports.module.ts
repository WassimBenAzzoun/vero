import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

// Domain boundary; routes and services arrive in the corresponding feature task.
@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
