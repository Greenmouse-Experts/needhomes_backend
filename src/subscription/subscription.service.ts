import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly repo: SubscriptionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createPlan(dto: any) {
    return this.repo.create({ ...dto });
  }

  async updatePlan(id: string, dto: any) {
    const plan = await this.repo.findOne({ id });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return this.repo.update({ id }, { ...dto });
  }

  async deletePlan(id: string) {
    const plan = await this.repo.findOne({ id });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return this.repo.delete({ id });
  }

  async listPlans() {
    return this.repo.findMany();
  }

  async getPlan(id: string) {
    const plan = await this.repo.findOne({ id });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }
}
