import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CursorQueryDto } from '../common/dto/cursor-query.dto';
export class ReviewFieldsDto {
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating: number;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  text: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  productName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  purchaseDate?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds?: string[];
}
export class CreateReviewDto extends ReviewFieldsDto {
  @ApiProperty() @IsUUID() submissionId: string;
}
export class EditReviewDto extends PartialType(ReviewFieldsDto) {}
export class ReviewQueryDto extends CursorQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  hasPhotos?: boolean;
}
export class FeedQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: ['latest', 'trending'] })
  @IsOptional()
  @IsIn(['latest', 'trending'])
  sort: 'latest' | 'trending' = 'latest';
}
