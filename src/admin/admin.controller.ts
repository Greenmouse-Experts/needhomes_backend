
import { Controller, Get, Post, Param, Body, UseGuards, Query, Patch, Delete } from '@nestjs/common';
import { VerificationService } from 'src/verification/verification.service';
import { AdminService } from './admin.service';
import { PropertyService } from 'src/property/property.service';
import { OutrightPurchaseDto } from 'src/property/dto/outright-purchase.dto';
import { CoDevelopmentDto } from 'src/property/dto/codevelopment.dto';
import { FractionalOwnershipDto } from 'src/property/dto/fractional.dto';
import { LandBankingDto } from 'src/property/dto/land-banking.dto';
import { SaveToOwnDto } from 'src/property/dto/save-to-own.dto';
import { InvestmentModel } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/auth.dto';
import { ListUsersDto } from './dto/account-type.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionKey } from 'app/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ListPropertiesDto } from './dto/list-properties.dto';
import { UpdatePropertyPublishedDto } from './dto/update-property.dto';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateSubscriptionPlanDto } from 'src/subscription/dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from 'src/subscription/dto/update-subscription-plan.dto';
import { UserService } from 'src/user/user.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly propertyService: PropertyService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService,
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
  @Post('verifications/:id/accept')
  async approveVerification(@Param('id') id: string) {
    return this.verificationService.approveVerification(id);
  }

  // Reject verification by verification document id with reason
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.VERIFICATION_REJECT_ALL)
  @Post('verifications/:id/reject')
  async rejectVerification(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('templateHtml') templateHtml?: string,
  ) {
    return this.verificationService.rejectVerification(id, reason, templateHtml);
  }

  // Admin login
  @Post('login')
  async adminLogin(@Body() dto: LoginDto, @Body('deviceInfo') deviceInfo?: any) {
    return this.authService.adminLogin(dto, deviceInfo);
  }

  // Admin: upload property (admin-only) - explicit endpoints per investment model so global ValidationPipe validates DTOs
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  @Post('properties/outright')
  async uploadOutright(@Body() dto: OutrightPurchaseDto) {
    return this.propertyService.createProperty(InvestmentModel.OUTRIGHT_PURCHASE, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  @Post('properties/codevelopment')
  async uploadCoDevelopment(@Body() dto: CoDevelopmentDto) {
    return this.propertyService.createProperty(InvestmentModel.CO_DEVELOPMENT, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  @Post('properties/fractional')
  async uploadFractional(@Body() dto: FractionalOwnershipDto) {
    return this.propertyService.createProperty(InvestmentModel.FRACTIONAL_OWNERSHIP, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  @Post('properties/land-banking')
  async uploadLandBanking(@Body() dto: LandBankingDto) {
    return this.propertyService.createProperty(InvestmentModel.LAND_BANKING, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  @Post('properties/save-to-own')
  async uploadSaveToOwn(@Body() dto: SaveToOwnDto) {
    return this.propertyService.createProperty(InvestmentModel.SAVE_TO_OWN, dto);
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

  //Admin: get user details by ID
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_READ_ALL)
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // Admin: list properties (with pagination and optional investmentModel filter)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_READ_ALL)
  @Get('properties')
  async adminListProperties(@Query() query: ListPropertiesDto) {
    return this.propertyService.listPublished(
      query.investmentModel as unknown as string,
      query.page,
      query.limit,
    );
  }

  // Admin: update property's published flag
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.USER_UPDATE_ALL)
  @Patch('properties/:id/published')
  async updatePropertyPublished(
    @Param('id') id: string,
    @Body() body: UpdatePropertyPublishedDto,
  ) {
    return this.propertyService.updatePublished(id, body.published);
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

  // Admin: manage subscription plans
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.SUBSCRIPTION_CREATE_ALL)
  @Post('subscriptions')
  async createSubscription(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.SUBSCRIPTION_UPDATE_ALL)
  @Patch('subscriptions/:id')
  async updateSubscription(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.SUBSCRIPTION_DELETE_ALL)
  @Delete('subscriptions/:id')
  async deleteSubscription(@Param('id') id: string) {
    return this.subscriptionService.deletePlan(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.SUBSCRIPTION_READ_ALL)
  @Get('subscriptions')
  async adminListSubscriptions() {
    return this.subscriptionService.listPlans();
  }

  
  
}
