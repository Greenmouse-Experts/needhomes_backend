import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  console.log('🔐 Creating Super Admin User\n');

  // Configuration
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const firstName = 'Super';
  const lastName = 'Admin';
  const phone = '+1234567890';

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists!`);
      console.log('   Use a different email or update the existing user.\n');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('📝 Creating user account...');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        accountType: 'CORPORATE',
        isEmailVerified: true,
        account_status: 'ACTIVE',
      },
    });

    console.log(`✅ User created with ID: ${user.id}\n`);

    // Get SUPER_ADMIN role
    console.log('🔍 Finding SUPER_ADMIN role...');
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (!superAdminRole) {
      console.log('❌ SUPER_ADMIN role not found!');
      console.log('   Make sure you ran the seed script: npm run prisma:seed\n');
      return;
    }

    console.log(`✅ Found SUPER_ADMIN role: ${superAdminRole.id}\n`);

    // Assign SUPER_ADMIN role
    console.log('🔗 Assigning SUPER_ADMIN role to user...');
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    console.log('✅ SUPER_ADMIN role assigned!\n');

    // Get permissions count
    const permissions = await prisma.rolePermission.count({
      where: { roleId: superAdminRole.id },
    });

    console.log('🎉 SUCCESS! Super Admin created:\n');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Permissions:', permissions);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    console.log('You can now login with these credentials and manage roles.\n');
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSuperAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
