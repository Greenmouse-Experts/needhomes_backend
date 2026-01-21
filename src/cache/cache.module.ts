import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache Module - Using Redis directly with ioredis
 * No cache-manager abstraction, just pure Redis
 */

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
