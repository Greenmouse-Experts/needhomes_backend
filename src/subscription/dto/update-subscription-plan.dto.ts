import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, Min } from 'class-validator';
import { PlanType } from '@prisma/client';

export class UpdateSubscriptionPlanDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsEnum(PlanType)
	type?: PlanType;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	price?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	validity?: number;

	@IsOptional()
	@IsBoolean()
	canViewPremiumProperty?: boolean;

	@IsOptional()
	@IsInt()
	maxInvestments?: number;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
