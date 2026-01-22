import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cache Service using ioredis directly
 * Direct Redis operations without cache-manager abstraction
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  async onModuleInit() {
    this.logger.log('Connecting to Redis...');
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  /**
   * Set value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // ========================================
  // Specialized Cache Methods
  // ========================================

  /**
   * Cache user permissions with 15 minute TTL
   */
  async cacheUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const key = `user:${userId}:permissions`;
    await this.set(key, permissions, 900); // 15 minutes
  }

  /**
   * Get cached user permissions
   */
  async getUserPermissions(userId: string): Promise<string[] | undefined> {
    const key = `user:${userId}:permissions`;
    return await this.get<string[]>(key);
  }

  /**
   * Cache user roles with 15 minute TTL
   */
  async cacheUserRoles(userId: string, roles: string[]): Promise<void> {
    const key = `user:${userId}:roles`;
    await this.set(key, roles, 900); // 15 minutes
  }

  /**
   * Get cached user roles
   */
  async getUserRoles(userId: string): Promise<string[] | undefined> {
    const key = `user:${userId}:roles`;
    return await this.get<string[]>(key);
  }

  /**
   * Invalidate user cache (call this when user roles/permissions change)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.delete(`user:${userId}:permissions`);
    await this.delete(`user:${userId}:roles`);
  }

  /**
   * Store OTP for email verification (5 minute TTL)
   */
  async storeOTP(email: string, otp: string): Promise<void> {
    const key = `otp:${email}`;
    await this.set(key, otp, 300); // 5 minutes
  }

  /**
   * Get OTP for email verification
   */
  async getOTP(email: string): Promise<string | undefined> {
    const key = `otp:${email}`;
    return await this.get<string>(key);
  }

  /**
   * Delete OTP after successful verification
   */
  async deleteOTP(email: string): Promise<void> {
    const key = `otp:${email}`;
    await this.delete(key);
  }

  /**
   * Track OTP attempts to prevent brute force
   */
  async incrementOTPAttempts(email: string): Promise<number> {
    const key = `otp:attempts:${email}`;
    const attempts = (await this.get<number>(key)) || 0;
    const newAttempts = attempts + 1;
    await this.set(key, newAttempts, 900); // 15 minutes
    return newAttempts;
  }

  /**
   * Get OTP attempts count
   */
  async getOTPAttempts(email: string): Promise<number> {
    const key = `otp:attempts:${email}`;
    return (await this.get<number>(key)) || 0;
  }

  /**
   * Reset OTP attempts
   */
  async resetOTPAttempts(email: string): Promise<void> {
    const key = `otp:attempts:${email}`;
    await this.delete(key);
  }

  /**
   * Password reset OTP helpers (separate namespace from email verification)
   */
  async storePasswordResetOTP(email: string, otp: string): Promise<void> {
    const key = `reset:otp:${email}`;
    await this.set(key, otp, 300);
  }

  async getPasswordResetOTP(email: string): Promise<string | undefined> {
    const key = `reset:otp:${email}`;
    return await this.get<string>(key);
  }

  async deletePasswordResetOTP(email: string): Promise<void> {
    const key = `reset:otp:${email}`;
    await this.delete(key);
  }

  async incrementPasswordResetOTPAttempts(email: string): Promise<number> {
    const key = `reset:otp:attempts:${email}`;
    const attempts = (await this.get<number>(key)) || 0;
    const newAttempts = attempts + 1;
    await this.set(key, newAttempts, 900);
    return newAttempts;
  }

  async getPasswordResetOTPAttempts(email: string): Promise<number> {
    const key = `reset:otp:attempts:${email}`;
    return (await this.get<number>(key)) || 0;
  }

  async resetPasswordResetOTPAttempts(email: string): Promise<void> {
    const key = `reset:otp:attempts:${email}`;
    await this.delete(key);
  }

  async storePasswordResetToken(token: string, email: string): Promise<void> {
    const key = `reset:token:${token}`;
    await this.set(key, { email }, 900);
  }

  async getPasswordResetToken(token: string): Promise<{ email: string } | undefined> {
    const key = `reset:token:${token}`;
    return await this.get<{ email: string }>(key);
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    const key = `reset:token:${token}`;
    await this.delete(key);
  }

  // ========================================
  // Session Management (JWT + Redis)
  // ========================================

  /**
   * Store refresh token (30 day TTL)
   */
  async storeRefreshToken(
    refreshToken: string,
    userId: string,
    sessionId: string,
    deviceInfo?: any,
  ): Promise<void> {
    const key = `refresh:${refreshToken}`;
    const sessionData = {
      userId,
      sessionId,
      createdAt: new Date().toISOString(),
      deviceInfo: deviceInfo || {},
    };
    await this.set(key, sessionData, 2592000); // 30 days
  }

  /**
   * Get refresh token data
   */
  async getRefreshToken(refreshToken: string): Promise<any> {
    const key = `refresh:${refreshToken}`;
    return await this.get(key);
  }

  /**
   * Delete refresh token (logout)
   */
  async deleteRefreshToken(refreshToken: string): Promise<void> {
    const key = `refresh:${refreshToken}`;
    await this.delete(key);
  }

  /**
   * Store active session for a user
   * Tracks all active sessions (devices) for a user
   */
  async addUserSession(
    userId: string,
    sessionId: string,
    deviceInfo: any,
  ): Promise<void> {
    const key = `sessions:${userId}`;
    const sessions = (await this.get<any[]>(key)) || [];
    
    sessions.push({
      sessionId,
      deviceInfo,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    await this.set(key, sessions, 2592000); // 30 days
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const key = `sessions:${userId}`;
    return (await this.get<any[]>(key)) || [];
  }

  /**
   * Remove a specific session
   */
  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `sessions:${userId}`;
    const sessions = (await this.get<any[]>(key)) || [];
    const filtered = sessions.filter((s) => s.sessionId !== sessionId);
    
    if (filtered.length > 0) {
      await this.set(key, filtered, 2592000);
    } else {
      await this.delete(key);
    }
  }

  /**
   * Remove all sessions for a user (logout from all devices)
   */
  async removeAllUserSessions(userId: string): Promise<void> {
    const key = `sessions:${userId}`;
    await this.delete(key);
  }

  /**
   * Check if a session is valid
   */
  async isSessionValid(userId: string, sessionId: string): Promise<boolean> {
    const sessions = await this.getUserSessions(userId);
    return sessions.some((s) => s.sessionId === sessionId);
  }

  /**
   * Update session last active time
   */
  async updateSessionActivity(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const key = `sessions:${userId}`;
    const sessions = (await this.get<any[]>(key)) || [];
    
    const updated = sessions.map((s) =>
      s.sessionId === sessionId
        ? { ...s, lastActive: new Date().toISOString() }
        : s,
    );

    await this.set(key, updated, 2592000);
  }
}
