import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProperty(data: any) {
    const { additionalFees, ...rest } = data;

    // Use a transaction to ensure property and its additional fees are created together
    return this.prisma.$transaction(async (prisma) => {
      const property = await prisma.property.create({ data: rest });

      if (additionalFees && Array.isArray(additionalFees) && additionalFees.length > 0) {
        const fees = additionalFees.map((f: any) => ({
          label: f.label,
          amount: f.amount,
          propertyId: property.id,
        }));

        // createMany inside the transaction
        await prisma.additionalFee.createMany({ data: fees });
      }

      // Return property with its additional fees
      return prisma.property.findUnique({
        where: { id: property.id },
        include: { additionalFees: true },
      });
    });
  }
}
