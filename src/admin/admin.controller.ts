
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { VerificationService } from 'src/verification/verification.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionKey } from 'app/common';

@Controller('admin')
export class AdminController {
  constructor(private readonly verificationService: VerificationService) {}

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
}
