# 🚀 Installation & Migration Steps

## Step 1: Install Dependencies

Run this command to install all required packages:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

## Step 2: Add Environment Variables

Create or update your `.env` file with:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-very-long-and-random

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/needhomes_db
```

⚠️ **Important**: Change `JWT_SECRET` to a strong random string in production!

## Step 3: Run Prisma Migration

This will create all the RBAC tables in your database:

```bash
npm run prisma:migrate
```

When prompted for migration name, enter:
```
add_rbac_and_email_verification
```

Expected output:
```
✔ Generated Prisma Client
✔ The migration has been created successfully
✔ Applied 1 migration
```

## Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

## Step 5: Seed Roles and Permissions

This populates your database with the 3 roles and all 32 permissions:

```bash
npm run prisma:seed
```

Expected output:
```
🌱 Starting RBAC seed...

📝 Creating permissions...
✅ Created/Updated 32 permissions

👥 Creating roles...
✅ Created/Updated 3 roles

🔗 Assigning permissions to roles...
   ✓ USER: 10 permissions assigned
   ✓ ADMIN: 8 permissions assigned
   ✓ SUPER_ADMIN: 32 permissions assigned

✅ RBAC seed completed successfully!
```

## Step 6: Start Your Server

```bash
npm run start:dev
```

Expected output:
```
[Nest] Application successfully started
```

## Step 7: Test the System

### Test 1: Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890",
    "accountType": "INVESTOR"
  }'
```

You should receive a response with:
- User object
- JWT token
- Roles: ["USER"]
- Permissions array

### Test 2: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123456"
  }'
```

Copy the `token` from the response for next tests.

### Test 3: Access Protected Route

```bash
# Get own profile (should work for USER role)
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Test 4: Try Accessing Admin Route (Should Fail)

```bash
# Get all users (should fail with 403 for USER role)
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

Expected response:
```json
{
  "statusCode": 403,
  "message": "Missing required permissions: user.read_all"
}
```

## Step 8: Promote User to Admin (Optional)

To test admin functionality, promote a user to ADMIN role:

### Option A: Using Prisma Studio

```bash
npx prisma studio
```

1. Open `Role` table, copy the `id` of ADMIN role
2. Open `UserRole` table
3. Click "Add record"
4. Set `userId` = your user's ID
5. Set `roleId` = the ADMIN role ID
6. Save

### Option B: Using SQL

```sql
-- Find user ID
SELECT id, email FROM "User" WHERE email = 'testuser@example.com';

-- Find ADMIN role ID
SELECT id, name FROM "Role" WHERE name = 'ADMIN';

-- Assign ADMIN role to user
INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
VALUES (1, 'admin-role-uuid-here', NOW());
```

### Option C: Using Code (Create an endpoint)

Create a temporary endpoint (remove in production):

```typescript
// In auth.controller.ts
@Post('promote-to-admin/:userId')
async promoteToAdmin(@Param('userId', ParseIntPipe) userId: number) {
  await this.rbacService.assignRoleToUser(userId, RoleName.ADMIN);
  return { message: 'User promoted to ADMIN' };
}
```

## Verification Checklist

✅ All dependencies installed  
✅ Environment variables configured  
✅ Prisma migration applied successfully  
✅ Seed script ran without errors  
✅ 3 roles exist in database (USER, ADMIN, SUPER_ADMIN)  
✅ 32 permissions exist in database  
✅ Can register a new user  
✅ User automatically receives USER role  
✅ Can login and receive JWT token  
✅ JWT contains roles and permissions  
✅ Can access `/users/me` with USER role  
✅ Cannot access `/users` with USER role (403)  
✅ After promoting to ADMIN, can access `/users`  

## Troubleshooting

### Issue: "Cannot find module '@app/common'"

**Solution**: Check your `tsconfig.json` has the correct path mapping:

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["libs/*"],
      "@app/common": ["libs/common/src"],
      "@app/common/*": ["libs/common/src/*"]
    }
  }
}
```

### Issue: Migration fails with "Role table already exists"

**Solution**: Your database might already have a Role table. Options:

1. Drop the conflicting table (if safe):
   ```sql
   DROP TABLE IF EXISTS "Role" CASCADE;
   ```
   Then run migration again.

2. Or reset database completely (⚠️ DELETES ALL DATA):
   ```bash
   npx prisma migrate reset
   npm run prisma:seed
   ```

### Issue: Seed script fails

**Solution**: Ensure:
1. Database connection is working
2. Prisma migration was applied first
3. Run `npx prisma generate` before seeding

### Issue: JWT validation fails

**Solution**: 
1. Check JWT_SECRET in `.env` is set
2. Ensure same secret is used in auth.module.ts
3. Check token hasn't expired (default: 7 days)

## Next Steps

1. ✅ **Email Verification**: Implement email sending (SendGrid, AWS SES, etc.)
2. ✅ **Password Reset**: Add forgot password flow
3. ✅ **Refresh Tokens**: Implement token refresh for long sessions
4. ✅ **Rate Limiting**: Add rate limiting to prevent abuse
5. ✅ **Audit Logging**: Log all admin actions
6. ✅ **Integration Tests**: Write tests for RBAC

## Support

- Read the [Full Setup Guide](RBAC_SETUP_GUIDE.md)
- Check the [Quick Reference](RBAC_QUICK_REFERENCE.md)
- Review [permissions.constant.ts](libs/common/src/constants/permissions.constant.ts) for all available permissions

## Success! 🎉

Your RBAC system is now fully configured and ready to use. All routes in `user.controller.ts` are protected with the appropriate permissions.

**Remember**: 
- USER role = can only manage own resources
- ADMIN role = can manage all resources (create_all, delete_all)
- SUPER_ADMIN role = has ALL permissions including role management
