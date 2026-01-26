import { Controller, Get, Post, Body } from '@nestjs/common';
import { BankService } from './bank.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';

@Controller('banks')
export class BankController {
    constructor(private readonly bankService: BankService) {}

    // apis for fetching all banks
    @Get()
    getAllBanks() {
        return this.bankService.getAllBanks();
    }

    @Post('resolve')
    async resolveAccount(@Body() dto: ResolveAccountDto) {
        return this.bankService.resolveAccount(dto);
    }
}
