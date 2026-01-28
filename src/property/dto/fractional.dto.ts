import { IsInt, IsOptional, IsString } from 'class-validator';
import { BasePropertyDto } from './base-property.dto';

export class FractionalOwnershipDto extends BasePropertyDto {
  @IsInt()
  totalShares: number;

  @IsInt()
  pricePerShare: number;

  @IsInt()
  minimumShares: number;

  @IsOptional()
  @IsString()
  exitWindow?: string;
}
