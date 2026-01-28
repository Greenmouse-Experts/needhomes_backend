import { IsNumber, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { BasePropertyDto } from './base-property.dto';

export class LandBankingDto extends BasePropertyDto {
  @IsNumber()
  plotSize: number; // square meters

  @IsInt()
  pricePerPlot: number;

  @IsInt()
  holdingPeriod: number; // months

  @IsOptional()
  @IsBoolean()
  buyBackOption?: boolean;
}
