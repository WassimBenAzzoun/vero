import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
export class AdminListDto extends CursorQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['OPEN', 'RESOLVED', 'DISMISSED'])
  status?: 'OPEN' | 'RESOLVED' | 'DISMISSED';
}
export class DecisionDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason: string;
}
export class ActionDto extends DecisionDto {
  @ApiProperty()
  @IsIn(['hide', 'restore', 'suspend', 'reactivate', 'resolve', 'dismiss'])
  action: 'hide' | 'restore' | 'suspend' | 'reactivate' | 'resolve' | 'dismiss';
}
export class MergeDto extends DecisionDto {
  @ApiProperty() @IsUUID() targetId: string;
}
export class CorrectShopDto extends DecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  links?: string[];
}
