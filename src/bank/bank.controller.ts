import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BankService } from './bank.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthUser } from 'src/auth/decorators/current-user.decorator';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { PermissionKey } from 'app/common';

@Controller('banks')
export class BankController {
    constructor(private readonly bankService: BankService) {}

    // apis for fetching all banks
    @Get()
    getAllBanks() {
        return this.bankService.getAllBanks();
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermissions(PermissionKey.BANK_CREATE_OWN)
    @Post('resolve')
    async resolveAccount(@Body() dto: ResolveAccountDto, @CurrentUser() user: AuthUser) {
        // resolve synchronously for client and persist asynchronously
        return this.bankService.resolveAccount(dto, user?.id as unknown as string);
    }
}
