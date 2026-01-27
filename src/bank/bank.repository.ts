import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BankRepository {
  private readonly logger = new Logger(BankRepository.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAllBanks() {
    return this.prisma.bank.findMany({ orderBy: { name: 'asc' } });
  }

  async findByCode(code: string) {
    if (code === undefined || code === null) return null;
    return this.prisma.bank.findFirst({ where: { code: String(code) } });
  }

  async findByName(name: string) {
    if (!name) return null;
    return this.prisma.bank.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  }

  async upsertBankAccount(userId: string, payload: any) {
    try {
      return await this.prisma.bankAccount.upsert({
        where: { user_id: userId },
        create: payload,
        update: payload,
      });
    } catch (err) {
      this.logger.error('Failed to upsert bank account', err as any);
      throw err;
    }
  }

  async getUserBankAccount(userId: string) {
    if (!userId) return null;
    return this.prisma.bankAccount.findUnique({ where: { user_id: userId } });
  }
}
