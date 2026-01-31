import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { PermissionKey } from 'app/common/constants/permissions.constant';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PermissionKey.SUBSCRIPTION_READ_ALL)
  @Get()
  async list() {
    return this.subscriptionService.listPlans();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.subscriptionService.getPlan(id);
  }
}
