import { Module } from '@nestjs/common';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { PaystackService } from './providers/paystack.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { BankRepository } from './bank.repository';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [BankController],
  providers: [BankService, PaystackService, BankRepository],
  exports: [PaystackService],
})
export class BankModule {}
