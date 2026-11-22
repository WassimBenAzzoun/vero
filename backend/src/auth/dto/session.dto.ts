import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ClientDto {
  @ApiPropertyOptional({ enum: ['native', 'web'], default: 'native' })
  @IsOptional()
  @IsIn(['native', 'web'])
  client?: 'native' | 'web' = 'native';
}
export class GoogleDto extends ClientDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(12000) idToken: string;
}
export class LinkGoogleDto extends GoogleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;
}
export class RefreshDto extends ClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  refreshToken?: string;
}
export class ForgotDto {
  @ApiProperty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;
}
export class ResetDto {
  @ApiProperty() @IsString() @MinLength(32) @MaxLength(256) token: string;
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
  password: string;
}
export class DeleteAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  idToken?: string;
}
