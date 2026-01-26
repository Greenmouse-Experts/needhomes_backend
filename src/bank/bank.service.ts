import { Injectable, Logger } from '@nestjs/common';
import { PaystackService } from './providers/paystack.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { PrismaService } from '../prisma/prisma.service';

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
    ) {}

    async getAllBanks(): Promise<any[]> {
        // Return the persisted bank list from the database only.
        // Seeding should be handled separately (idempotent seed script).
        const dbBanks = await this.prisma.bank.findMany({ orderBy: { name: 'asc' } });
        return dbBanks;
    }

    async findByCode(code: string): Promise<any | null> {
        if (code === undefined || code === null) return null;
        const bank = await this.prisma.bank.findFirst({ where: { code: String(code) } });
        return bank;
    }

    async findByName(name: string): Promise<any | null> {
        if (!name) return null;
        const bank = await this.prisma.bank.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
        return bank;
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
                    await this.prisma.bankAccount.upsert({
                        where: { user_id: userId },
                        create: {
                            user_id: userId,
                            account_number: resolution.accountNumber,
                            bank_code: resolution.bankCode ?? '',
                            bank_name: resolution.bankName ?? '',
                            account_name: resolution.accountName ?? '',
                            country: resolution.country ?? 'NG',
                        },
                        update: {
                            account_number: resolution.accountNumber,
                            bank_code: resolution.bankCode ?? '',
                            bank_name: resolution.bankName ?? '',
                            account_name: resolution.accountName ?? '',
                            country: resolution.country ?? 'NG',
                            updatedAt: new Date(),
                        },
                    });
                } catch (err) {
                    this.logger.error('Failed to persist resolved bank account', err as any);
                }
            })();
        }

        return raw;
    }
}
