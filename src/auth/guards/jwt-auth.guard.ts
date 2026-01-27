import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * Use this guard to protect routes that require authentication
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // If JWT strategy threw an error, it's already an UnauthorizedException
    if (err) {
      throw err;
    }

    // If no user was returned and no error, it means token was missing or invalid
    if (!user) {
      // info contains the error details from passport-jwt
      const errorMessage = info?.message || 'Bearer token is missing or invalid';
      throw new UnauthorizedException(errorMessage);
    }

    return user;
  }
}
