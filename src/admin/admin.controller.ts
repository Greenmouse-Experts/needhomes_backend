
import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { VerificationService } from 'src/verification/verification.service';
import { AdminService } from './admin.service';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/auth.dto';
import { ListUsersDto } from './dto/account-type.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionKey } from 'app/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}


  

  // View all verification documents (admin)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.VERIFICATION_APPROVE_ALL)
  @Get('verifications')
  async listVerifications() {
    return this.verificationService.listAllVerifications();
  }

  // Approve verification for a user
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.VERIFICATION_APPROVE_ALL)
  @Post('verifications/:userId/accept')
  async approveVerification(@Param('userId') userId: string) {
    return this.verificationService.approveVerification(userId);
  }

  // Admin login
  @Post('login')
  async adminLogin(@Body() dto: LoginDto, @Body('deviceInfo') deviceInfo?: any) {
    return this.authService.adminLogin(dto, deviceInfo);
  }

  // Reject verification for a user with reason
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.VERIFICATION_REJECT_ALL)
  @Post('verifications/:userId/reject')
  async rejectVerification(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Body('templateHtml') templateHtml?: string,
  ) {
    return this.verificationService.rejectVerification(userId, reason, templateHtml);
  }

  // Admin: list users with optional accountType filter
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_READ_ALL)
  @Get('users')
  async listUsers(@Query() query: ListUsersDto) {
    // Validation handled by ValidationPipe + class-validator via DTO
    return this.adminService.listUsers(
      query.accountType as unknown as string,
      query.page,
      query.limit,
    );
  }

  //view user verification
  @UseGuards(JwtAuthGuard, PermissionsGuard)
     @RequirePermissions(PermissionKey.VERIFICATION_READ_OWN)
    @Get('verifications/:userId')
    async getVerificationWithBank(
      @Param('userId') userId: string,
    ) {
      return this.verificationService.getUserVerification(userId);
    }

  
  
}
