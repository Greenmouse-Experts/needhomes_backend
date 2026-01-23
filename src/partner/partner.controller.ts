import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Delete,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { PartnerService } from './partner.service';
import {
  RegisterPartnerDto,
  LoginPartnerDto,
  VerifyPartnerEmailDto,
} from '../auth/dto/partner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PartnerOnlyGuard } from '../auth/guards/partner-only.guard';
import { CurrentPartner, AuthPartner } from '../auth/decorators/current-partner.decorator';
import { PERMISSIONS_KEY, RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionKey } from 'app/common';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';

@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterPartnerDto) {
    return this.partnerService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyPartnerEmailDto, @Req() req: Request) {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    return this.partnerService.verifyEmail(dto.email, dto.otp, deviceInfo);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOTP(@Body() body: { email: string }) {
    return this.partnerService.resendOTP(body.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginPartnerDto, @Req() req: Request) {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    return this.partnerService.login(dto, deviceInfo);
  }

  // Protected routes (require authentication + partner type)
  @UseGuards(JwtAuthGuard, PartnerOnlyGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_READ_OWN)
  @Get('me')
  async getProfile(@CurrentPartner() partner: AuthPartner) {
    return this.partnerService.getProfile(partner.id);
  }

  // ========================================
  // Session Management
  // ========================================

  /**
   * Refresh access token using refresh token
   */
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    return this.partnerService.refreshAccessToken(body.refreshToken, deviceInfo);
  }

  /**
   * Get all active sessions for current partner
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard, PartnerOnlyGuard)
  async getSessions(@CurrentPartner() partner: AuthPartner) {
    const sessions = await this.partnerService.getPartnerSessions(partner.id);
    return {
      partnerId: partner.id,
      sessions,
    };
  }

  /**
   * Logout from a specific session/device
   */
  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard, PartnerOnlyGuard)
  async logoutSession(
    @CurrentPartner() partner: AuthPartner,
    @Param('sessionId') sessionId: string,
  ) {
    await this.partnerService.logoutSession(partner.id, sessionId);
    return {
      message: 'Session logged out successfully',
    };
  }

  /**
   * Logout from all devices
   */
  @Delete('sessions')
  @UseGuards(JwtAuthGuard, PartnerOnlyGuard)
  async logoutAllSessions(@CurrentPartner() partner: AuthPartner) {
    await this.partnerService.logoutAllSessions(partner.id);
    return {
      message: 'Logged out from all devices successfully',
    };
  }
}
