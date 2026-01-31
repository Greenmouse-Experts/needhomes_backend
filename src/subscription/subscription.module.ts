import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService, SubscriptionRepository],
  controllers: [SubscriptionController],
  exports: [SubscriptionService, SubscriptionRepository],
})
export class SubscriptionModule {}
