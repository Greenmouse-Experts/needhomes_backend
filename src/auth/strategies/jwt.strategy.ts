import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RbacService } from '../rbac.service';
import { CacheService } from '../../cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * JWT Strategy for authentication
 * This validates JWT tokens and attaches user + permissions to request
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private rbacService: RbacService,
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * This method is called automatically after JWT is validated
   * The payload comes from your JWT token
   * @param payload - JWT payload { sub: userId, email, sessionId, ... }
   * @returns User object with permissions attached (will be set as request.user)
   */
  async validate(payload: any) {
    const userId = payload.sub;
    const sessionId = payload.sessionId;

    // 1. Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        account_status: true,
        isEmailVerified: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found or deleted');
    }

    if (user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }


    // 2. Validate session (if sessionId exists)
    if (sessionId) {
      const isSessionValid = await this.cacheService.isSessionValid(userId, sessionId);
      if (!isSessionValid) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Update last active time
      await this.cacheService.updateSessionActivity(userId, sessionId);
    }

    // 3. Load roles and permissions (from cache if available)
    const [roles, permissions] = await this.getRolesAndPermissionsWithCache(userId);

    // 4. Return user object (will be attached to request.user)
    const userObject = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      isEmailVerified: user.isEmailVerified,
      sessionId, // Include sessionId for logout operations
      roles,
      permissions, // ⚠️ This is what PermissionsGuard checks!
    };
    return userObject;
  }

  /**
   * Get roles and permissions with caching
   * Checks cache first, falls back to database if not found
   */
  private async getRolesAndPermissionsWithCache(
    userId: string,
  ): Promise<[string[], string[]]> {
    // Try cache first
    const [cachedRoles, cachedPermissions] = await Promise.all([
      this.cacheService.getUserRoles(userId),
      this.cacheService.getUserPermissions(userId),
    ]);

    if (cachedRoles && cachedPermissions) {
      return [cachedRoles, cachedPermissions];
    }

    // Cache miss - fetch from database
    const [roles, permissions] = await Promise.all([
      this.rbacService.getUserRoles(userId),
      this.rbacService.getUserPermissions(userId),
    ]);

    // Store in cache for next time (15 minute TTL)
    await Promise.all([
      this.cacheService.cacheUserRoles(userId, roles),
      this.cacheService.cacheUserPermissions(userId, permissions),
    ]);

    return [roles, permissions];
  }
}
