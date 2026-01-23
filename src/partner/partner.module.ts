import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { PartnerRepository } from './partner.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    NotificationModule,
    AuthModule, // Import AuthModule for JWT and strategies
  ],
  controllers: [PartnerController],
  providers: [PartnerService, PartnerRepository],
  exports: [PartnerService, PartnerRepository],
})
export class PartnerModule {}
