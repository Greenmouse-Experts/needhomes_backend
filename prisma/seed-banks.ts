import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import axios from 'axios';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  }),
});

async function seedBanksFromPaystack() {
  console.log('\n🌱 Starting Bank seed from Paystack...\n');

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const baseUrl = process.env.PAYSTACK_BASE_URL;

  if (!secret || !baseUrl) {
    console.warn('PAYSTACK credentials not provided. Skipping bank seed.');
    return;
  }

  try {
    const { data } = await axios.get(`${baseUrl}/bank`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    const banks = data?.data || data;
    if (!Array.isArray(banks)) {
      console.warn('Unexpected banks response shape, skipping bank seed');
      return;
    }

    console.log(`🔁 Upserting ${banks.length} banks`);
    for (const b of banks) {
      // Use the unique `code` as the upsert key to avoid duplicate-code conflicts.
      // Provide `id` in create so existing rows updated by code keep their current id.
      try {
        await prisma.bank.upsert({
          where: { code: String(b.code) },
          create: {
            id: b.id,
            name: b.name,
            slug: b.slug || null,
            code: String(b.code),
            longcode: b.longcode || null,
            gateway: b.gateway || null,
            pay_with_bank: !!b.pay_with_bank,
            supports_transfer: !!b.supports_transfer,
            available_for_direct_debit: !!b.available_for_direct_debit,
            active: !!b.active,
            country: b.country || 'Nigeria',
            currency: b.currency || 'NGN',
            type: b.type || null,
            is_deleted: !!b.is_deleted,
            createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
            updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
          },
          update: {
            name: b.name,
            slug: b.slug || null,
            code: String(b.code),
            longcode: b.longcode || null,
            gateway: b.gateway || null,
            pay_with_bank: !!b.pay_with_bank,
            supports_transfer: !!b.supports_transfer,
            available_for_direct_debit: !!b.available_for_direct_debit,
            active: !!b.active,
            country: b.country || 'Nigeria',
            currency: b.currency || 'NGN',
            type: b.type || null,
            is_deleted: !!b.is_deleted,
            updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
          },
        });
      } catch (err: any) {
        // Log and continue with next bank. Common causes: race conditions, unexpected duplicates.
        console.warn(`⚠️ Failed to upsert bank code=${b.code} id=${b.id}:`, err?.message || err);
      }
    }

    console.log('\n✅ Bank seed completed successfully!');
  } catch (err: any) {
    console.error('❌ Error seeding banks:', err?.response?.data || err.message || err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

seedBanksFromPaystack().catch((err) => {
  console.error(err);
  process.exit(1);
});
