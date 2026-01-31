import { PlanType } from '@prisma/client';

export class SubscriptionPlanDto {
  id: string;
  name: string;
  type: PlanType;
  description?: string;
  price?: number;
  validity: number;
  canViewPremiumProperty: boolean;
  maxInvestments?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
