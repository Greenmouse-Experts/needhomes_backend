import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthPartner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string | null;
  type: 'partner';
  roles: string[];
  permissions: string[];
  sessionId?: string;
}

/**
 * Decorator to get the current authenticated partner from the request
 * @example
 * @Get('me')
 * @UseGuards(JwtAuthGuard, PartnerOnlyGuard)
 * getProfile(@CurrentPartner() partner: AuthPartner) {
 *   return { id: partner.id, email: partner.email };
 * }
 */
export const CurrentPartner = createParamDecorator(
  (data: keyof AuthPartner | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const partner = request.user; // JWT strategy attaches partner to request.user

    return data ? partner?.[data] : partner;
  },
);
