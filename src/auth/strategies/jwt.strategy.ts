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
   * @param payload - JWT payload { sub: userId/partnerId, email, sessionId, type, ... }
   * @returns User/Partner object with permissions attached (will be set as request.user)
   */
  async validate(payload: any) {
    const id = payload.sub;
    const type = payload.type || 'user'; // 'user' or 'partner'
    const sessionId = payload.sessionId;

    // Handle partner authentication
    if (type === 'partner') {
      return this.validatePartner(id, sessionId);
    }

    // Handle user authentication (existing logic)
    return this.validateUser(id, sessionId);
  }

  /**
   * Validate user authentication
   */
  private async validateUser(userId: string, sessionId?: string) {
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
      type: 'user',
      roles,
      permissions, // ⚠️ This is what PermissionsGuard checks!
    };
    return userObject;
  }

  /**
   * Validate partner authentication
   */
  private async validatePartner(partnerId: string, sessionId?: string) {
    // 1. Verify partner exists and is active
    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId, accountType: 'PARTNER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        account_status: true,
        isEmailVerified: true,
        referralCode: true,
        deletedAt: true,
      },
    });

    if (!partner || partner.deletedAt) {
      throw new UnauthorizedException('Partner not found or deleted');
    }

    if (partner.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // 2. Validate session (if sessionId exists)
    if (sessionId) {
      const isSessionValid = await this.cacheService.isSessionValid(
        partnerId,
        sessionId,
      );
      if (!isSessionValid) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Update last active time
      await this.cacheService.updateSessionActivity(partnerId, sessionId);
    }

    // 3. Load roles and permissions (from cache if available)
    const [roles, permissions] =
      await this.getPartnerRolesAndPermissionsWithCache(partnerId);

    // 4. Return partner object (will be attached to request.user)
    const partnerObject = {
      id: partner.id,
      sub: partner.id, // Add sub for consistency
      email: partner.email,
      firstName: partner.firstName,
      lastName: partner.lastName,
      referralCode: partner.referralCode,
      isEmailVerified: partner.isEmailVerified,
      sessionId,
      type: 'partner',
      roles,
      permissions, // ⚠️ This is what PermissionsGuard checks!
    };
    return partnerObject;
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

  /**
   * Get partner roles and permissions with caching
   */
  private async getPartnerRolesAndPermissionsWithCache(
    partnerId: string,
  ): Promise<[string[], string[]]> {
    const cacheKey = `partner:${partnerId}`;
    
    // Try cache first
    const [cachedRoles, cachedPermissions] = await Promise.all([
      this.cacheService.getUserRoles(cacheKey),
      this.cacheService.getUserPermissions(cacheKey),
    ]);

    if (cachedRoles && cachedPermissions) {
      return [cachedRoles, cachedPermissions];
    }

    // Cache miss - fetch from database
    const [roles, permissions] = await Promise.all([
      this.rbacService.getPartnerRoles(partnerId),
      this.rbacService.getPartnerPermissions(partnerId),
    ]);

    // Store in cache for next time (15 minute TTL)
    await Promise.all([
      this.cacheService.cacheUserRoles(cacheKey, roles),
      this.cacheService.cacheUserPermissions(cacheKey, permissions),
    ]);

    return [roles, permissions];
  }
}
