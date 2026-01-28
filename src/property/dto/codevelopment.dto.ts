import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { BasePropertyDto } from './base-property.dto';

export class CoDevelopmentDto extends BasePropertyDto {
  @IsInt()
  minimumInvestment: number;

  @IsNumber()
  profitSharingRatio: number; // e.g. 0.2 = 20%

  @IsInt()
  projectDuration: number; // months

  @IsOptional()
  @IsString()
  exitRule?: string;
}
