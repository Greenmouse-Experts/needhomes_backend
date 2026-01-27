import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from './rbac.service';
import { CacheService } from '../cache/cache.service';
import { UserRepository } from '../user/user.repository';
import { EmailService } from '../notification/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RoleName } from 'app/common';
import { internationalisePhoneNumber } from 'app/common/utils/phonenumber.utils';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Prisma, AccountType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private rbacService: RbacService,
    private cacheService: CacheService,
    private userRepository: UserRepository,
    private emailService: EmailService,
  ) {}

  /**
   * Register a new user with USER role by default
   */
  async register(registerDto: RegisterDto, accountType: string) {
    // Validate accountType
    if (!accountType || !['INDIVIDUAL', 'CORPORATE'].includes(accountType.toUpperCase())) {
      throw new BadRequestException('Account type must be either INDIVIDUAL or CORPORATE');
    }

    const normalizedAccountType = accountType.toUpperCase() as AccountType;

    // Validate required fields based on account type
    if (normalizedAccountType === 'INDIVIDUAL') {
      if (!registerDto.firstName || !registerDto.lastName) {
        throw new BadRequestException('First name and last name are required for individual accounts');
      }
    }

    if (normalizedAccountType === 'CORPORATE') {
      if (!registerDto.companyName) {
        throw new BadRequestException('Company name is required for corporate accounts');
      }
    }

    // Internationalize phone number
    const internationalPhone = internationalisePhoneNumber(registerDto.phone);

    // 1. Check if user already exists
    const existingUser = await this.userRepository.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingPhone = await this.userRepository.findOne({
      phone: internationalPhone,
    });

    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. Create user (unverified) - Type-safe with Prisma.UserCreateInput
    const userData: Prisma.UserCreateInput = {
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName || null,
      lastName: registerDto.lastName || null,
      phone: internationalPhone,
      accountType: normalizedAccountType,
      isEmailVerified: false,
      ...(registerDto.companyName && { companyName: registerDto.companyName }),
      ...(registerDto.referral_source && { referral_source: registerDto.referral_source }),
    };

    const user = await this.userRepository.create(userData);

    // 4. Assign USER role by default
    await this.rbacService.assignRoleToUser(user.id, RoleName.USER);

    // 5. Generate and send OTP
    const otp = this.generateOTP();
    await this.cacheService.storeOTP(user.email, otp);

    // Verify it was stored
    const storedOtp = await this.cacheService.getOTP(user.email);

    // Send OTP via email
    await this.emailService.sendOTP(user.email, otp);

    return {
      message: 'Registration successful. Please verify your email with the OTP sent.',
      email: user.email,
      userId: user.id,
      accountType: user.accountType,
      // For development only - remove in production:
      otp: process.env.NODE_ENV === 'dev' ? otp : undefined,
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, deviceInfo?: any) {
    // 1. Find user
    const user = await this.userRepository.findOne({
      email: loginDto.email,
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Check account status
    if (user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // 4. Check email verification
    if (!user.isEmailVerified) {
      // Generate and send new OTP
      const otp = this.generateOTP();
       this.cacheService.storeOTP(user.email, otp);
       this.emailService.sendOTP(user.email, otp);
      
      throw new ForbiddenException(
        'Email not verified. A new verification code has been sent to your email.',
      );
    }

    // 5. Get roles and permissions (with caching)
    const [roles, permissions] = await this.getRolesAndPermissionsWithCache(user.id);

    // 6. Generate tokens and session
    const { accessToken, refreshToken, sessionId } = await this.generateTokensWithSession(
      user.id,
      user.email,
      roles,
      permissions,
      deviceInfo,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        isEmailVerified: user.isEmailVerified,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email: string, otp: string, deviceInfo?: any) {
    
    // 1. Check OTP attempts (prevent brute force)
    const attempts = await this.cacheService.getOTPAttempts(email);
    if (attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // 2. Get stored OTP from cache
    const cachedOTP = await this.cacheService.getOTP(email);

    if (!cachedOTP) {
      throw new BadRequestException(
        'OTP expired or not found. Please request a new OTP.',
      );
    }

    // 3. Verify OTP (convert both to string for comparison)
    const otpString = String(otp);
    if (cachedOTP !== otpString) {
      await this.cacheService.incrementOTPAttempts(email);
      throw new BadRequestException('Invalid OTP');
    }

    // 4. Update user as verified
    const user = await this.userRepository.update(
      { email },
      { isEmailVerified: true },
    );

    // 5. Clean up
    await this.cacheService.deleteOTP(email);
    await this.cacheService.resetOTPAttempts(email);

    // Send welcome email
  const displayName = user.accountType === 'CORPORATE' 
  ? user.companyName || 'need homes user'
: user.firstName || 'need homes user';
   this.emailService.sendWelcomeEmail(user.email, displayName);

    // 6. Get roles and permissions for JWT
    const [roles, permissions] = await this.getRolesAndPermissionsWithCache(user.id);

    // 7. Generate tokens and session
    const { accessToken, refreshToken, sessionId } = await this.generateTokensWithSession(
      user.id,
      user.email,
      roles,
      permissions,
      deviceInfo,
    );

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        AccountType: user.accountType,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Resend OTP for email verification
   */
  async resendOTP(email: string) {
    // 1. Find user
    const user = await this.userRepository.findOne({
      email,
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 2. Generate new OTP
    const otp = this.generateOTP();
    await this.cacheService.storeOTP(email, otp);
    await this.cacheService.resetOTPAttempts(email);

    // Send OTP via email
    await this.emailService.sendOTP(email, otp);

    return {
      message: 'OTP sent successfully',
      // For development only:
      otp: process.env.NODE_ENV === 'dev' ? otp : undefined,
    };
  }

  /**
   * Request password reset via OTP sent to email
   */
  async requestPasswordReset(email: string, accountType?: string) {
    const whereClause: any = { email };
    if (accountType) {
      whereClause.accountType = accountType;
    }

    const user = await this.userRepository.findOne(whereClause);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before resetting your password.',
      );
    }


    // Return generic message to avoid email enumeration
    if (!user || user.deletedAt) {
      return {
        message:
          'If the account exists, a verification code has been sent to the email provided.',
      };
    }

    const otp = this.generateOTP();
    await this.cacheService.storePasswordResetOTP(email, otp);
    await this.cacheService.resetPasswordResetOTPAttempts(email);

    await this.emailService.sendPasswordResetOTP(email, otp);

    return {
      message:
        'If the account exists, a verification code has been sent to the email provided.',
      otp: process.env.NODE_ENV === 'dev' ? otp : undefined,
    };
  }

  /**
   * Verify password reset OTP and issue short-lived reset token
   */
  async verifyPasswordResetOtp(email: string, otp: string, accountType?: string) {
    const whereClause: any = { email };
    if (accountType) {
      whereClause.accountType = accountType;
    }

    const user = await this.userRepository.findOne(whereClause);

    if (!user || user.deletedAt) {
      await this.cacheService.incrementPasswordResetOTPAttempts(email);
      throw new BadRequestException('Invalid or expired OTP');
    }

    const attempts = await this.cacheService.getPasswordResetOTPAttempts(email);
    if (attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    const cachedOTP = await this.cacheService.getPasswordResetOTP(email);

    if (!cachedOTP) {
      throw new BadRequestException(
        'OTP expired or not found. Please request a new OTP.',
      );
    }

    if (String(cachedOTP) !== String(otp)) {
      await this.cacheService.incrementPasswordResetOTPAttempts(email);
      throw new BadRequestException('Invalid OTP');
    }

    // OTP is valid — clean up and issue reset token
    await this.cacheService.deletePasswordResetOTP(email);
    await this.cacheService.resetPasswordResetOTPAttempts(email);

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.cacheService.storePasswordResetToken(resetToken, email);

    return {
      message: 'OTP verified. Use the reset token to set a new password.',
      resetToken,
    };
  }

  /**
   * Reset password using verified reset token
   */
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenData = await this.cacheService.getPasswordResetToken(token);

    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({ email: tokenData.email });

    if (!user || user.deletedAt) {
      throw new BadRequestException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update({ id: user.id }, { password: hashedPassword });

    // Clean up reset artifacts and active sessions
    await this.cacheService.deletePasswordResetToken(token);
    await this.cacheService.deletePasswordResetOTP(tokenData.email);
    await this.cacheService.resetPasswordResetOTPAttempts(tokenData.email);
    await this.cacheService.removeAllUserSessions(user.id);

    return {
      message: 'Password reset successful. Please login with your new credentials.',
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userRepository.findOne({ id: userId });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update({ id: userId }, { password: hashed });

    // Invalidate user's sessions
    await this.cacheService.removeAllUserSessions(userId);

    return { message: 'Password changed successfully' };
  }

  /**
   * Get roles and permissions with caching
   */
  private async getRolesAndPermissionsWithCache(
    userId: string,
  ): Promise<[string[], string[]]> {
    // Try to get from cache first
    const [cachedRoles, cachedPermissions] = await Promise.all([
      this.cacheService.getUserRoles(userId),
      this.cacheService.getUserPermissions(userId),
    ]);

    if (cachedRoles && cachedPermissions) {
      return [cachedRoles, cachedPermissions];
    }

    // If not in cache, fetch from database
    const [roles, permissions] = await Promise.all([
      this.rbacService.getUserRoles(userId),
      this.rbacService.getUserPermissions(userId),
    ]);

    // Store in cache for future requests
    await Promise.all([
      this.cacheService.cacheUserRoles(userId, roles),
      this.cacheService.cacheUserPermissions(userId, permissions),
    ]);

    return [roles, permissions];
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate JWT tokens with session tracking
   */
  private async generateTokensWithSession(
    userId: string,
    email: string,
    roles: string[],
    permissions: string[],
    deviceInfo?: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }> {
    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Generate access token (JWT - 1 hour)
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        roles,
        permissions,
        sessionId,
      },
      { expiresIn: '1h' },
    );

    // Generate refresh token (random string - 30 days)
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Store refresh token in Redis with device info
    await this.cacheService.storeRefreshToken(
      refreshToken,
      userId,
      sessionId,
      deviceInfo,
    );

    // Add session to user's active sessions
    await this.cacheService.addUserSession(userId, sessionId, deviceInfo);

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    newDeviceInfo?: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Validate refresh token and get session info
    const sessionData = await this.cacheService.getRefreshToken(refreshToken);

    if (!sessionData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { userId, sessionId, deviceInfo } = sessionData;

    // Check if user still exists
    const user = await this.userRepository.findOne({
      id: userId,
    });

    if (!user || !user.isEmailVerified) {
      throw new UnauthorizedException('User not found or not verified');
    }

    // Get fresh roles and permissions
    const [roles, permissions] = await this.getRolesAndPermissionsWithCache(
      userId,
    );

    // Generate new tokens with same session
    const newAccessToken = this.jwtService.sign(
      {
        sub: userId,
        email: user.email,
        roles,
        permissions,
        sessionId,
      },
      { expiresIn: '1h' },
    );

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    // Delete old refresh token
    await this.cacheService.deleteRefreshToken(refreshToken);

    // Store new refresh token
    await this.cacheService.storeRefreshToken(
      newRefreshToken,
      userId,
      sessionId,
      newDeviceInfo || deviceInfo,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<
    Array<{
      sessionId: string;
      deviceInfo: any;
      createdAt: Date;
    }>
  > {
    return this.cacheService.getUserSessions(userId);
  }

  /**
   * Logout from a specific session
   */
  async logoutSession(userId: string, sessionId: string): Promise<void> {
    // Remove session
    await this.cacheService.removeUserSession(userId, sessionId);

    // Find and delete associated refresh token
    // This requires storing sessionId->refreshToken mapping
    // For now, we'll just remove the session
  }

  /**
   * Logout from all devices
   */
  async logoutAllSessions(userId: string): Promise<void> {
    await this.cacheService.removeAllUserSessions(userId);
  }
}
