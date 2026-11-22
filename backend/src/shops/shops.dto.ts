import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
export class ShopSearchDto extends CursorQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) q?: string;
}
export class CreateShopDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;
  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  links: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  governorate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
}
