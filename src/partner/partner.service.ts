import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PartnerRepository } from './partner.repository';
import {
  RegisterPartnerDto,
  LoginPartnerDto,
  
} from '../auth/dto/partner.dto';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../notification/email.service';
import { RoleName } from '../../libs/common/src/constants/permissions.constant';
import { PrismaService } from '../prisma/prisma.service';
import { internationalisePhoneNumber } from 'app/common/utils/phonenumber.utils';
import { RbacService } from '../auth/rbac.service';
import { AuthService } from '../auth/auth.service';
import { AccountType } from '@prisma/client';


@Injectable()
export class PartnerService {
  constructor(
    private partnerRepository: PartnerRepository,
    private jwtService: JwtService,
    private cacheService: CacheService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private rbacService: RbacService,
    private authService: AuthService,
  ) {}

  /**
   * Generate a unique referral code for the partner
   */
  private async generateUniqueReferralCode(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const base = `${firstName}${lastName}`.toUpperCase().replace(/[^A-Z]/g, '');
    let code = base.substring(0, 6);
    let counter = 1;

    while (await this.partnerRepository.findByReferralCode(code)) {
      code = `${base.substring(0, 4)}${counter.toString().padStart(2, '0')}`;
      counter++;
    }

    return code;
  }

  /**
   * Generate OTP and cache it
   */
  private async generateAndCacheOTP(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `partner_otp:${email}`;
    await this.cacheService.set(cacheKey, otp, 300); // 5 minutes
    return otp;
  }

  /**
   * Register a new partner
   */
  async register(dto: RegisterPartnerDto) {
    // Check if email already exists
    const existingEmail = await this.partnerRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
   
    const existingPhone = await this.partnerRepository.findByPhone(dto.phone);
    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const phoneNumber = internationalisePhoneNumber(dto.phone);

    // Create partner (referralCode will be generated after KYC verification)
    const partner = await this.partnerRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: phoneNumber,
      password: hashedPassword,
      accountType: AccountType.PARTNER, // Set accountType to PARTNER
      partnerType: dto.partnerType,
    });

    // Assign PARTNER role
    const partnerRole = await this.prisma.role.findUnique({
      where: { name: RoleName.PARTNER },
    });

    if (partnerRole) {
      await this.prisma.partnerRole.create({
        data: {
          userId: partner.id,
          roleId: partnerRole.id,
        },
      });
    }

    // Generate and send OTP
    const otp = await this.generateAndCacheOTP(partner.email);
    await this.emailService.sendOTP(partner.email, otp);

    return {
      message: 'Otp sent to your email,please verify your email. It will expire in 5 minutes',
      partner: {
        id: partner.id,
        email: partner.email,
        referralCode: partner.referralCode,
      },
    };
  }

  /**
   * Verify partner email with OTP
   */
  async verifyEmail(email: string, otp: string, deviceInfo?: any) {
    const cacheKey = `partner_otp:${email}`;
    const cachedOTP = await this.cacheService.get(cacheKey);

    if (!cachedOTP || cachedOTP !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const partner = await this.partnerRepository.findByEmail(email);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Update partner as verified
    await this.partnerRepository.update(partner.id, {
      isEmailVerified: true,
    });

    // Delete OTP from cache
    await this.cacheService.delete(cacheKey);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      partner.email,
      partner.firstName || 'Partner'
    );

    // Get roles and permissions
    const [roles, permissions] = await this.getPartnerRolesAndPermissionsWithCache(partner.id);

    // Generate tokens with session
    const { accessToken, refreshToken, sessionId } = await this.generateTokensWithSession(
      partner.id,
      partner.email,
      roles,
      permissions,
      deviceInfo,
    );

    return {
      message: 'Email verified successfully',
      partner: {
        id: partner.id,
        email: partner.email,
        firstName: partner.firstName,
        lastName: partner.lastName,
        referralCode: partner.referralCode,
        isEmailVerified: partner.isEmailVerified,
        AccountType: partner.accountType,
        partnerType: partner.partnerType,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Resend OTP for partner email verification
   */
  async resendOTP(email: string) {
    const partner = await this.partnerRepository.findByEmail(email);

    if (!partner) {
      throw new BadRequestException('Partner not found');
    }

    if (partner.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const cacheKey = `partner_otp:${email}`;
    await this.cacheService.set(cacheKey, otp, 300); // 5 minutes

    // Send OTP via email
    await this.emailService.sendOTP(email, otp);

    return {
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'dev' ? otp : undefined,
    };
  }

  /**
   * Partner login
   */
  async login(dto: LoginPartnerDto, deviceInfo?: any) {
    const partner = await this.partnerRepository.findByEmail(dto.email);

    if (!partner) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, partner.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!partner.isEmailVerified) {
      // Generate and cache a new OTP, send to partner's email, then inform client
      const otp = await this.generateAndCacheOTP(partner.email);
      await this.emailService.sendOTP(partner.email, otp);
      throw new ForbiddenException(
        'Email not verified. A new verification code has been sent to your email.',
      );
    }

    if (partner.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Get roles and permissions
    const [roles, permissions] = await this.getPartnerRolesAndPermissionsWithCache(partner.id);

    // Generate tokens with session
    const { accessToken, refreshToken, sessionId } = await this.generateTokensWithSession(
      partner.id,
      partner.email,
      roles,
      permissions,
      deviceInfo,
    );

    return {
      message: 'Login successful',
      partner: {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        email: partner.email,
        referralCode: partner.referralCode,
        totalReferrals: partner.totalReferrals,
        totalCommission: partner.totalCommission,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Generate JWT tokens with session tracking
   */
  private async generateTokensWithSession(
    partnerId: string,
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
        sub: partnerId,
        email,
        type: 'partner',
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
      partnerId,
      sessionId,
      deviceInfo,
    );

    // Add session to partner's active sessions
    await this.cacheService.addUserSession(partnerId, sessionId, deviceInfo);

    return { accessToken, refreshToken, sessionId };
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

  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get partner profile
   */
  async getProfile(partnerId: string) {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return {
      id: partner.id,
      firstName: partner.firstName,
      lastName: partner.lastName,
      email: partner.email,
      phone: partner.phone,
      referralCode: partner.referralCode,
      totalReferrals: partner.totalReferrals,
      totalCommission: partner.totalCommission,
      isEmailVerified: partner.isEmailVerified,
      account_status: partner.account_status,
      account_verification_status: partner.account_verification_status,
      accountType: partner.accountType,
      createdAt: partner.createdAt,
    };
  }

  /**
   * Change password for authenticated partner
   */
  async changePassword(partnerId: string, oldPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, partner.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.partnerRepository.update(partnerId, { password: hashed });

    // Invalidate partner's sessions
    await this.cacheService.removeAllUserSessions(partnerId);

    return { message: 'Password changed successfully' };
  }

  /**
   * Generate referral code for verified partner (Admin action)
   */
  async generateReferralCodeForPartner(partnerId: string) {
    const partner = await this.partnerRepository.findById(partnerId);
    
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    if (partner.referralCode) {
      throw new BadRequestException('Partner already has a referral code');
    }

    if (partner.account_verification_status !== 'VERIFIED') {
      throw new BadRequestException('Partner must be verified before generating referral code');
    }

    // Generate unique referral code
    const referralCode = await this.generateUniqueReferralCode(
      partner.firstName || 'Partner',
      partner.lastName || 'User',
    );

    // Update partner with referral code
    await this.partnerRepository.update(partnerId, {
      referralCode,
    });

    return {
      message: 'Referral code generated successfully',
      referralCode,
    };
  }
}
