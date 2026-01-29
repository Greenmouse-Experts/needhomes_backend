import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InvestmentModel } from '@prisma/client';

export class ListPropertiesDto {
  @IsOptional()
  @IsEnum(InvestmentModel)
  investmentModel?: InvestmentModel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
