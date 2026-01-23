import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Partner } from '@prisma/client';

@Injectable()
export class PartnerRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PartnerCreateInput): Promise<Partner> {
    return this.prisma.partner.create({ data });
  }

  async findByEmail(email: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({
      where: { email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByPhone(phone: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({
      where: { phone, deletedAt: null },
    });
  }

  async findByReferralCode(referralCode: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({
      where: { referralCode, deletedAt: null },
    });
  }

  async findById(id: string): Promise<Partner | null> {
    return this.prisma.partner.findUnique({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.PartnerUpdateInput,
  ): Promise<Partner> {
    return this.prisma.partner.update({
      where: { id },
      data,
    });
  }
}
