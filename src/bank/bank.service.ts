import { Injectable, Logger } from '@nestjs/common';
import { PaystackService } from './providers/paystack.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BankRepository } from './bank.repository';

interface ResolutionResult {
    accountNumber: string;
    bankCode?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    country?: string | null;
}

@Injectable()
export class BankService {
    private readonly logger = new Logger(BankService.name);
    constructor(
        private readonly paystackService: PaystackService,
        private readonly prisma: PrismaService,
        private readonly bankRepository: BankRepository,
    ) {}

    async getAllBanks(): Promise<any[]> {
        return this.bankRepository.getAllBanks();
    }

    async findByCode(code: string): Promise<any | null> {
        return this.bankRepository.findByCode(code);
    }

    async findByName(name: string): Promise<any | null> {
        return this.bankRepository.findByName(name);
    }

    async resolveAccount(dto: ResolveAccountDto, userId?: string): Promise<any> {
        const raw = await this.paystackService.resolveAccount(dto.accountNumber, dto.bankCode);

        // Normalize response (Paystack shape: { status, data: { account_number, account_name, bank_id } })
        const data = raw?.data || raw;

        const resolution: ResolutionResult = {
            accountNumber: data?.account_number || dto.accountNumber,
            accountName: data?.account_name || null,
            bankCode: dto.bankCode || null,
            bankName: null,
            country: 'NG',
        };

        // Enqueue fire-and-forget upsert (non-blocking)
        if (userId) {
            (async () => {
                try {
                    await this.bankRepository.upsertBankAccount(userId, {
                        user_id: userId,
                        account_number: resolution.accountNumber,
                        bank_code: resolution.bankCode ?? '',
                        bank_name: resolution.bankName ?? '',
                        account_name: resolution.accountName ?? '',
                        country: resolution.country ?? 'NG',
                      updatedAt: new Date(),
                    });
                } catch (err) {
                    this.logger.error('Failed to persist resolved bank account', err as any);
                }
            })();
        }

        return raw;
    }

    /**
     * Return the bank account record for a given user id
     */
    async getUserBankAccount(userId: string): Promise<any | null> {
        return this.bankRepository.getUserBankAccount(userId);
    }
}
