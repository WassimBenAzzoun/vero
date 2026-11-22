import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ReportReason } from '../generated/prisma/client';
export class ReportDto {
  @ApiProperty() @IsIn(['review', 'comment', 'shop']) targetType:
    'review' | 'comment' | 'shop';
  @ApiProperty() @IsUUID() targetId: string;
  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
