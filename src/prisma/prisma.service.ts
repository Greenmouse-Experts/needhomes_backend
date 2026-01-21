import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { base } from './prisma.middleware';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  constructor(private configService: ConfigService) {
    const databaseUrl = process.env.NODE_ENV === 'test'
      ? configService.get<string>('TEST_DATABASE_URL')
      : configService.get<string>('DATABASE_URL');

      process.env.DATABASE_URL = databaseUrl!;
    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
      log: ['query', 'info', 'warn', 'error'],
    });
    // Register the middleware directly
    this.$extends({
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => {
            return base()(args, query);
          },
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log('PrismaService connecting to database');
    await this.$connect();
    this.logger.log('PrismaService connected to database');
  }

  async onModuleDestroy() {
    this.logger.log('PrismaService disconnecting from database');
    await this.$disconnect();
    this.logger.log('PrismaService disconnected from database');
  }
}
