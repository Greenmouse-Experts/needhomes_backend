import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationRepository {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateVerification(userId: string, data: any) {
    return this.prisma.verificationDocument.upsert({
      where: { user_id: userId },
      update: {
        ...data,
        submitedAt: new Date(),
      },
      create: {
        user_id: userId,
        ...data,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.verificationDocument.findUnique({
      where: { user_id: userId },
    });
  }

  async findById(id: string) {
    return this.prisma.verificationDocument.findUnique({
      where: { id },
    });
  }

 
  
  /**
   * Fetch verification document and bank account via the user relation in one query
   */
  async getUserVerification(userId: string) {
    const userWithRelations = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verification_document: true,
        bank_account: true,
      },
    });

    if (!userWithRelations) return null;

    return {
      verification: userWithRelations.verification_document,
      bank: userWithRelations.bank_account || null,
    };
  }

  async getAllVerifications() {
    const docs = await this.prisma.verificationDocument.findMany({
      orderBy: { submitedAt: 'desc' },
      include: { user: { include: { bank_account: true } } },
    });

    return docs
  }
}