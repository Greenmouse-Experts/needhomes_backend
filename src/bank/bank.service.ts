import { Injectable } from '@nestjs/common';
import { PaystackService } from './providers/paystack.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';

@Injectable()
export class BankService {
    constructor(private readonly paystackService: PaystackService) {}

    async getAllBanks(): Promise<any[]> {
        // delegate to Paystack provider; returns list of banks
        return this.paystackService.fetchAllBanks();
    }

    async resolveAccount(dto: ResolveAccountDto): Promise<any> {
        return this.paystackService.resolveAccount(dto.accountNumber, dto.bankCode);
    }
}
