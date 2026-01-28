import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

import { VerificationModule } from 'src/verification/verification.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [VerificationModule, UserModule, AuthModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],

})
export class AdminModule {}
