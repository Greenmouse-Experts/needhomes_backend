import { IsInt, IsOptional, IsString } from 'class-validator';
import { BasePropertyDto } from './base-property.dto';

export class SaveToOwnDto extends BasePropertyDto {
  @IsInt()
  targetPropertyPrice: number;

  @IsOptional()
  @IsString()
  savingsFrequency?: string;

  @IsInt()
  savingsDuration: number; // months
}
