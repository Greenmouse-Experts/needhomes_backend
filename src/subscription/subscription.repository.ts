import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { PrismaBaseRepository } from 'src/prisma/prisma.base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscriptionRepository extends PrismaBaseRepository<
  SubscriptionPlan,
  Prisma.SubscriptionPlanCreateInput,
  Prisma.SubscriptionPlanUpdateInput,
  Prisma.SubscriptionPlanWhereUniqueInput,
  Prisma.SubscriptionPlanWhereInput,
  Prisma.SubscriptionPlanUpsertArgs
> {
  constructor(prisma: PrismaService) {
    super('subscriptionPlan', prisma);
  }

}
