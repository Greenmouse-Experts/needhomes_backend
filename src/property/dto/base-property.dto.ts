import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, InvestmentModel, DevelopmentStage } from '@prisma/client';

class AdditionalFeeDto {
  @IsString()
  label: string;

  @IsInt()
  amount: number; // stored in kobo
}

export class BasePropertyDto {
  @IsString()
  propertyTitle: string;

  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsOptional()
  @IsEnum(InvestmentModel)
  investmentModel?: InvestmentModel;

  @IsString()
  location: string;

  @IsString()
  description: string;

  @IsEnum(DevelopmentStage)
  developmentStage: DevelopmentStage;

  @IsDateString()
  completionDate: string;

  @IsOptional()
  @IsBoolean()
  premiumProperty?: boolean;

  @IsString()
  coverImage: string;

  @IsArray()
  @IsString({ each: true })
  galleryImages: string[];

  @IsOptional()
  @IsString()
  videos?: string;

  @IsOptional()
  @IsString()
  certificate?: string;

  @IsOptional()
  @IsString()
  surveyPlanDocument?: string;

  @IsOptional()
  @IsString()
  brochure?: string;

  @IsOptional()
  @IsString()
  transferDocument?: string;

  @IsInt()
  basePrice: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalFeeDto)
  additionalFees?: AdditionalFeeDto[];

  @IsInt()
  availableUnits: number;

  @IsInt()
  totalPrice: number;
}

export class AdditionalFeeDtoExport extends AdditionalFeeDto {}
