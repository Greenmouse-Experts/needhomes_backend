import { Global, Module } from '@nestjs/common';
import { PrismaBaseService } from './prisma.base.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaBaseService, PrismaService],
  exports: [PrismaService, PrismaBaseService],
})
export class PrismaModule {}
