import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionKey } from 'app/common';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Apply JWT auth + permissions to all routes
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ========================================
  // USER Routes (own resources only)
  // ========================================

  /**
   * Get own profile
   * Permission: user.read_own
   */
  @Get('profile')
  @RequirePermissions(PermissionKey.USER_READ_OWN)
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.userService.findOne(userId);
  }

  @Post('profile-picture')
  @RequirePermissions(PermissionKey.USER_UPDATE_OWN)
  uploadProfilePicture(@CurrentUser('id') userId: string, @Body('profilePicture') profilePicture: string) {
    return this.userService.update(userId, { profilePicture });
  }

  /**
   * Update own profile
   * Permission: user.update_own
   */
  @Put('profile')
  @RequirePermissions(PermissionKey.USER_UPDATE_OWN)
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.userService.update(userId, updateData);
  }

  /**
   * Delete own account
   * Permission: user.delete_own
   */
  @Delete('me')
  @RequirePermissions(PermissionKey.USER_DELETE_OWN)
  deleteMyAccount(@CurrentUser('id') userId: string) {
    return this.userService.softDelete(userId);
  }



  // ========================================
  // ADMIN Routes (all resources)
  // ========================================

  /**
   * Get all users
   * Permission: user.read_all (ADMIN, SUPER_ADMIN)
   */
  @Get()
  @RequirePermissions(PermissionKey.USER_READ_ALL)
  getAllUsers() {
    return this.userService.findAll();
  }



  /**
   * Create a new user
   * Permission: user.create_all (ADMIN, SUPER_ADMIN)
   */
  @Post()
  @RequirePermissions(PermissionKey.USER_CREATE_ALL)
  createUser(@Body() createData: any) {
    return this.userService.create(createData);
  }

  /**
   * Update any user
   * Permission: user.update_all (ADMIN, SUPER_ADMIN)
   */
  @Put(':id')
  @RequirePermissions(PermissionKey.USER_UPDATE_ALL)
  updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.userService.update(id, updateData);
  }

  /**
   * Delete any user
   * Permission: user.delete_all (ADMIN, SUPER_ADMIN)
   */
  @Delete(':id')
  @RequirePermissions(PermissionKey.USER_DELETE_ALL)
  deleteUser(@Param('id') id: string) {
    return this.userService.softDelete(id);
  }
}
