import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from 'app/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permission keys required to access the route
 * @example
 * @RequirePermissions(PermissionKey.USER_DELETE_ALL)
 * @Delete(':id')
 * deleteUser(@Param('id') id: string) { ... }
 */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
