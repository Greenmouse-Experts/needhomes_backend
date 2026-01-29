import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';
import { PropertyController } from './property.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PropertyService, PropertyRepository],
  controllers: [PropertyController],
  exports: [PropertyService, PropertyRepository],
})
export class PropertyModule {}
