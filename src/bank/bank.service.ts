import { Injectable, Logger } from '@nestjs/common';
import { PaystackService } from './providers/paystack.service';
import { ResolveAccountDto } from './dto/resolve-account.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BankRepository } from './bank.repository';
import { CacheService } from '../cache/cache.service';

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
        private readonly cacheService: CacheService,
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
        // If we have a userId, try cache-first to avoid DB/provider calls
        const cacheKey = userId ? `user:${userId}:bank` : null;
        if (cacheKey && (await this.cacheService.has(cacheKey))) {
            const cached = await this.cacheService.get<any>(cacheKey);
            if (cached) return cached;
        }

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

        // If a userId is provided, upsert the bank account and return that result.
        if (userId) {
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

                // Normalized bank object to return and cache
                const normalized = {
                    account_number: resolution.accountNumber,
                    bank_code: resolution.bankCode ?? '',
                    bank_name: resolution.bankName ?? '',
                    account_name: resolution.accountName ?? '',
                    country: resolution.country ?? 'NG',
                };

                // Cache the user's bank account (1 hour TTL)
                if (cacheKey) {
                    try {
                        await this.cacheService.set(cacheKey, normalized, 3600);
                    } catch (err) {
                        this.logger.warn('Failed to cache user bank account', err as any);
                    }
                }

                return normalized;
            } catch (err) {
                this.logger.error('Failed to upsert resolved bank account', err as any);
                throw err;
            }
        }

        // No userId: return the raw resolution from the provider.
        return raw;
    }

    /**
     * Return the bank account record for a given user id
     */
    async getUserBankAccount(userId: string): Promise<any | null> {
        const cacheKey = `user:${userId}:bank`;

        // Try cache-first
        if (await this.cacheService.has(cacheKey)) {
            this.logger.debug(`Cache hit for user bank account: ${userId}`);    
            const cached = await this.cacheService.get<any>(cacheKey);
            if (cached) return cached;
        }

        // Fallback to DB and cache the result
        const record = await this.bankRepository.getUserBankAccount(userId);
        if (record) {
            this.logger.debug(`Cache miss for user bank account: ${userId}`);    
            try {
                await this.cacheService.set(cacheKey, record, 3600);
            } catch (err) {
                this.logger.warn('Failed to cache user bank account', err as any);
            }
        }

        return record;
    }
}
