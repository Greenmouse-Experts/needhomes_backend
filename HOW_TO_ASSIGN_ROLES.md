# 🔑 How to Assign Roles to Users

## Overview

There are **4 ways** to assign roles in your RBAC system. Choose based on your needs.

---

## Method 1: Automatic Assignment (Already Working ✅)

New users automatically get the **USER** role when they register.

```typescript
// Happens automatically in auth.service.ts
POST /auth/register
```

**When to use**: This is the default for all new registrations. No action needed!

---

## Method 2: Via API Endpoints (Recommended for Production)

### Prerequisites
- You need a SUPER_ADMIN user first (see Method 4 below)
- Get their JWT token by logging in

### Available Endpoints

#### A. Assign Role to User
```bash
POST /auth/roles/assign
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "userId": 1,
  "roleName": "ADMIN"
}
```

**Response:**
```json
{
  "message": "Role ADMIN assigned to user 1"
}
```

#### B. Remove Role from User
```bash
DELETE /auth/roles/remove
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "userId": 1,
  "roleName": "USER"
}
```

#### C. Get User's Roles and Permissions
```bash
GET /auth/roles/user/1
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

**Response:**
```json
{
  "userId": 1,
  "roles": ["USER", "ADMIN"],
  "permissions": [
    "user.create_own",
    "user.read_own",
    "user.create_all",
    "user.delete_all",
    ...
  ]
}
```

### Example: Promote User to Admin

```bash
# 1. Login as SUPER_ADMIN
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password"
  }'

# 2. Use the token to assign ADMIN role
curl -X POST http://localhost:3000/auth/roles/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "userId": 5,
    "roleName": "ADMIN"
  }'
```

---

## Method 3: Programmatically in Code

Use `RbacService` in any service or controller:

```typescript
import { RbacService } from './auth/rbac.service';
import { RoleName } from '@app/common/constants/permissions.constant';

@Injectable()
export class SomeService {
  constructor(private rbacService: RbacService) {}

  async promoteUser(userId: number) {
    // Assign ADMIN role
    await this.rbacService.assignRoleToUser(userId, RoleName.ADMIN);
    
    // Check if user has a role
    const isAdmin = await this.rbacService.userHasRole(userId, RoleName.ADMIN);
    
    // Get all user's roles
    const roles = await this.rbacService.getUserRoles(userId);
    
    // Get all user's permissions
    const permissions = await this.rbacService.getUserPermissions(userId);
  }
}
```

**When to use**: 
- Custom business logic
- Automated role assignment based on conditions
- Admin dashboard features

---

## Method 4: Directly in Database (For First SUPER_ADMIN)

### Step 1: Find Role IDs

```bash
npx prisma studio
```

Or use SQL:
```sql
SELECT id, name FROM "Role";
```

You'll get something like:
```
id                                   | name
-------------------------------------|-------------
550e8400-e29b-41d4-a716-446655440000 | USER
550e8400-e29b-41d4-a716-446655440001 | ADMIN
550e8400-e29b-41d4-a716-446655440002 | SUPER_ADMIN
```

### Step 2: Find Your User ID

```sql
SELECT id, email FROM "User" WHERE email = 'your-email@example.com';
```

### Step 3: Assign Role

```sql
INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
VALUES (
  1,  -- Your user ID
  '550e8400-e29b-41d4-a716-446655440002',  -- SUPER_ADMIN role ID
  NOW()
);
```

Or in Prisma Studio:
1. Open `UserRole` table
2. Click "Add record"
3. Set `userId` to your user's ID (e.g., 1)
4. Set `roleId` to SUPER_ADMIN's role UUID
5. Set `assignedAt` to current timestamp
6. Save

**When to use**: 
- Creating your first SUPER_ADMIN
- Emergency access recovery
- Development/testing

---

## Method 5: Create a Seed Script (Development)

Create a script to set up admin users:

```typescript
// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'superadmin@example.com';
  const password = await bcrypt.hash('SuperSecurePassword123', 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+1234567890',
      accountType: 'CORPORATE',
      isEmailVerified: true,
    },
  });

  // Get SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  // Assign role
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ Super Admin created:', email);
}

createSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it:
```bash
npx ts-node scripts/create-admin.ts
```

---

## Quick Reference: Role Assignment Workflow

### 1. Initial Setup (First Time)
```
1. Run migration & seed → Creates 3 roles
2. Register a user → Gets USER role automatically
3. Use Method 4 (Database) → Manually make them SUPER_ADMIN
4. Login as SUPER_ADMIN → Get JWT token
5. Now you can use Method 2 (API) for all future assignments
```

### 2. Production Workflow
```
1. New user registers → Gets USER role
2. SUPER_ADMIN uses API → Promotes to ADMIN if needed
3. ADMIN can now manage users
```

---

## Testing Role Assignment

### Test 1: Assign ADMIN Role
```bash
POST /auth/roles/assign
{
  "userId": 2,
  "roleName": "ADMIN"
}
```

### Test 2: Verify User Has New Role
```bash
# Login as the user
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response should include:
{
  "user": {
    "roles": ["USER", "ADMIN"],  ← Should see both roles
    "permissions": [...]           ← Should have ADMIN permissions
  }
}
```

### Test 3: Test New Permissions
```bash
# User should now access admin endpoints
GET /users
Authorization: Bearer USER_WITH_ADMIN_ROLE_TOKEN

# Should return 200 with all users
```

---

## Available Roles

| Role | Description | Assigned When |
|------|-------------|---------------|
| **USER** | Standard user, own resources only | Automatically on registration |
| **ADMIN** | Full user management | Manually assigned by SUPER_ADMIN |
| **SUPER_ADMIN** | Complete system access | Manually assigned (first one via DB) |

---

## Security Notes

⚠️ **Important:**
- Only SUPER_ADMIN can assign roles (protected by `role.assign` permission)
- Users can have multiple roles (e.g., USER + ADMIN)
- Permissions are cumulative (having ADMIN gives you both USER and ADMIN permissions)
- Always use HTTPS in production when transmitting JWT tokens

---

## Troubleshooting

### Issue: "Missing required permissions: role.assign"
**Solution**: You're not logged in as SUPER_ADMIN. Use Method 4 to create first SUPER_ADMIN.

### Issue: Role not taking effect
**Solution**: User needs to login again to get new JWT with updated permissions.

### Issue: Can't find SUPER_ADMIN role
**Solution**: Make sure you ran the seed script:
```bash
npm run prisma:seed
```

---

## Summary

**For first SUPER_ADMIN**: Use Method 4 (Database)  
**For all other assignments**: Use Method 2 (API)  
**For development**: Use Method 5 (Seed Script)  
**For custom logic**: Use Method 3 (RbacService)  

Your role assignment system is now **fully functional**! 🎉
