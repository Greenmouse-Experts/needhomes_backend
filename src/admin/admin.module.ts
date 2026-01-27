import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

import { VerificationModule } from 'src/verification/verification.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [VerificationModule, UserModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],

})
export class AdminModule {}
