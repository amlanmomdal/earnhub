import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeInput } from '../../../common/utils/sanitize.util';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Product' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => sanitizeInput(value))
  name?: string;

  @ApiPropertyOptional({ example: 'binance-user-123' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => sanitizeInput(value))
  binanceAccount?: string;
}
