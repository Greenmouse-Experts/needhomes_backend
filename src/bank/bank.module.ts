import { Module } from '@nestjs/common';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { PaystackService } from './providers/paystack.service';

@Module({
  controllers: [BankController],
  providers: [BankService, PaystackService],
  exports: [PaystackService],
})
export class BankModule {}
