import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PermissionKey,
  RoleName,
  ROLE_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
} from '../libs/common/src/constants/permissions.constant';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});


async function seedRolesAndPermissions() {
  console.log('🌱 Starting RBAC seed...\n');

  try {
    // 1. Create all permissions
    console.log('📝 Creating permissions...');
    const permissionPromises = Object.values(PermissionKey).map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {
          description: PERMISSION_DESCRIPTIONS[key],
        },
        create: {
          key,
          description: PERMISSION_DESCRIPTIONS[key],
        },
      }),
    );

    const permissions = await Promise.all(permissionPromises);
    console.log(`✅ Created/Updated ${permissions.length} permissions\n`);

    // 2. Create all roles
    console.log('👥 Creating roles...');
    const rolePromises = Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {
          description: ROLE_DESCRIPTIONS[name],
        },
        create: {
          name,
          description: ROLE_DESCRIPTIONS[name],
        },
      }),
    );

    const roles = await Promise.all(rolePromises);
    console.log(`✅ Created/Updated ${roles.length} roles\n`);

    // 3. Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');

    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const role = roles.find((r) => r.name === roleName);
      if (!role) continue;

      // Delete existing permissions for this role
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // Assign new permissions
      const rolePermissionPromises = permissionKeys.map((permissionKey) => {
        const permission = permissions.find((p) => p.key === permissionKey);
        if (!permission) return null;

        return prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      });

      await Promise.all(rolePermissionPromises.filter(Boolean));
      console.log(
        `   ✓ ${roleName}: ${permissionKeys.length} permissions assigned`,
      );
    }

    console.log('\n✅ RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Roles: ${roles.length}`);
    console.log(`   - Permissions: ${permissions.length}`);
    console.log(`   - USER role: ${ROLE_PERMISSIONS[RoleName.USER].length} permissions`);
    console.log(`   - ADMIN role: ${ROLE_PERMISSIONS[RoleName.ADMIN].length} permissions`);
    console.log(`   - SUPER_ADMIN role: ${ROLE_PERMISSIONS[RoleName.SUPER_ADMIN].length} permissions`);
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedRolesAndPermissions()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
