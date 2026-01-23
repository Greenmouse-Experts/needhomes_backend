import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class RbacService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get all permissions for a user by their ID
   * This loads the user's roles and all associated permissions
   * @param userId - The user's ID
   * @returns Array of permission keys
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) {
      return [];
    }

    // Extract unique permissions from all roles
    const permissionSet = new Set<string>();

    userWithRoles.roles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePermission) => {
        permissionSet.add(rolePermission.permission.key);
      });
    });

    return Array.from(permissionSet);
  }

  /**
   * Get all roles for a user by their ID
   * @param userId - The user's ID
   * @returns Array of role names
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!userWithRoles) {
      return [];
    }

    return userWithRoles.roles.map((userRole) => userRole.role.name);
  }

  /**
   * Assign a role to a user
   * @param userId - The user's ID
   * @param roleName - The role name (e.g., 'USER', 'ADMIN', 'SUPER_ADMIN')
   */
  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      create: {
        userId,
        roleId: role.id,
      },
      update: {},
    });

    // Invalidate cache so new permissions take effect immediately
    await this.cacheService.invalidateUserCache(userId);
  }

  /**
   * Remove a role from a user
   * @param userId - The user's ID
   * @param roleName - The role name
   */
  async removeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    // Invalidate cache so permission changes take effect immediately
    await this.cacheService.invalidateUserCache(userId);
  }

  /**
   * Check if a user has a specific permission
   * @param userId - The user's ID
   * @param permissionKey - The permission key
   * @returns true if user has the permission
   */
  async userHasPermission(
    userId: string,
    permissionKey: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionKey);
  }

  /**
   * Check if a user has a specific role
   * @param userId - The user's ID
   * @param roleName - The role name
   * @returns true if user has the role
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(roleName);
  }

  /**
   * Get all permissions for a partner by their ID
   * @param partnerId - The partner's ID
   * @returns Array of permission keys
   */
  async getPartnerPermissions(partnerId: string): Promise<string[]> {
    const partnerWithRoles = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!partnerWithRoles) {
      return [];
    }

    // Extract unique permissions from all roles
    const permissionSet = new Set<string>();

    partnerWithRoles.roles.forEach((partnerRole) => {
      partnerRole.role.permissions.forEach((rolePermission) => {
        permissionSet.add(rolePermission.permission.key);
      });
    });

    return Array.from(permissionSet);
  }

  /**
   * Get all roles for a partner by their ID
   * @param partnerId - The partner's ID
   * @returns Array of role names
   */
  async getPartnerRoles(partnerId: string): Promise<string[]> {
    const partnerWithRoles = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!partnerWithRoles) {
      return [];
    }

    return partnerWithRoles.roles.map((partnerRole) => partnerRole.role.name);
  }

  /**
   * Assign a role to a partner
   * @param partnerId - The partner's ID
   * @param roleName - The role name (e.g., 'PARTNER')
   */
  async assignRoleToPartner(partnerId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await this.prisma.partnerRole.upsert({
      where: {
        partnerId_roleId: {
          partnerId,
          roleId: role.id,
        },
      },
      create: {
        partnerId,
        roleId: role.id,
      },
      update: {},
    });

    // Invalidate cache so new permissions take effect immediately
    const cacheKey = `partner:${partnerId}`;
    await this.cacheService.invalidateUserCache(cacheKey);
  }

  /**
   * Remove a role from a partner
   * @param partnerId - The partner's ID
   * @param roleName - The role name
   */
  async removeRoleFromPartner(partnerId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await this.prisma.partnerRole.delete({
      where: {
        partnerId_roleId: {
          partnerId,
          roleId: role.id,
        },
      },
    });

    // Invalidate cache so permission changes take effect immediately
    const cacheKey = `partner:${partnerId}`;
    await this.cacheService.invalidateUserCache(cacheKey);
  }
}
