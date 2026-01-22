import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RbacService } from './rbac.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/permissions.decorator';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordRequestDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { AssignRoleDto, RemoveRoleDto } from './dto/role.dto';
import { PermissionKey } from 'app/common';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rbacService: RbacService,
  ) {}

  /**
   * Register a new user (sends OTP)
   * @Query accountType - INVESTOR or CORPORATE
   */
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Query('accountType') accountType: string,
  ) {   
    return this.authService.register(registerDto, accountType);
  }

  /**
   * Verify email with OTP
   */
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; otp: string }, @Req() req: Request) {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    return this.authService.verifyEmail(body.email, body.otp, deviceInfo);
  }

  /**
   * Resend OTP for email verification
   */
  @Post('resend-otp')
  async resendOTP(@Body() body: { email: string }) {
    return this.authService.resendOTP(body.email);
  }

  /**
   * Login (requires verified email)
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    return this.authService.login(loginDto, deviceInfo);
  }

  /**
   * Request password reset OTP
   */
  @Post('password/forgot')
  async forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  /**
   * Verify password reset OTP and get reset token
   */
  @Post('password/verify-otp')
  async verifyResetOtp(@Body() body: VerifyResetOtpDto) {
    return this.authService.verifyPasswordResetOtp(body.email, body.otp);
  }

  /**
   * Reset password with reset token
   */
  @Post('password/reset')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(
      body.token,
      body.newPassword,
      body.confirmPassword,
    );
  }

  /**
   * Get current user profile (requires authentication)
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_READ_OWN)
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  // ========================================
  // Role Management (SUPER_ADMIN only)
  // ========================================

  /**
   * Assign a role to a user
   * Permission: role.assign (SUPER_ADMIN only)
   */
  @Post('roles/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.ROLE_ASSIGN)
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    await this.rbacService.assignRoleToUser(
      assignRoleDto.userId,
      assignRoleDto.roleName,
    );

    return {
      message: `Role ${assignRoleDto.roleName} assigned to user ${assignRoleDto.userId}`,
    };
  }

  /**
   * Remove a role from a user
   * Permission: role.assign (SUPER_ADMIN only)
   */
  @Delete('roles/remove')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.ROLE_ASSIGN)
  async removeRole(@Body() removeRoleDto: RemoveRoleDto) {
    await this.rbacService.removeRoleFromUser(
      removeRoleDto.userId,
      removeRoleDto.roleName,
    );

    return {
      message: `Role ${removeRoleDto.roleName} removed from user ${removeRoleDto.userId}`,
    };
  }

  /**
   * Get user's roles and permissions
   * Permission: role.read (SUPER_ADMIN only)
   */
  @Get('roles/user/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.ROLE_READ)
  async getUserRoles(@Param('userId') userId: string) {
    const [roles, permissions] = await Promise.all([
      this.rbacService.getUserRoles(userId),
      this.rbacService.getUserPermissions(userId),
    ]);

    return {
      userId,
      roles,
      permissions,
    };
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
    return this.authService.refreshAccessToken(body.refreshToken, deviceInfo);
  }

  /**
   * Get all active sessions for current user
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: any) {
    const sessions = await this.authService.getUserSessions(user.id);
    return {
      userId: user.id,
      sessions,
    };
  }

  /**
   * Logout from a specific session/device
   */
  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async logoutSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    await this.authService.logoutSession(user.id, sessionId);
    return {
      message: 'Session logged out successfully',
    };
  }

  /**
   * Logout from all devices
   */
  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async logoutAllSessions(@CurrentUser() user: any) {
    await this.authService.logoutAllSessions(user.id);
    return {
      message: 'Logged out from all devices successfully',
    };
  }
}
