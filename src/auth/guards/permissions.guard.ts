import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionKey } from 'app/common';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);


    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;


    // Check if user exists
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has permissions array
    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('User has no permissions assigned');
    }


    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );


    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
