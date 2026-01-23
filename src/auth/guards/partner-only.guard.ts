import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard to ensure only partners can access certain routes
 * This checks the 'type' field in the JWT payload
 */
@Injectable()
export class PartnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if the authenticated entity is a partner
    if (user.type !== 'partner') {
      throw new ForbiddenException(
        'This endpoint is only accessible to partners',
      );
    }

    return true;
  }
}
