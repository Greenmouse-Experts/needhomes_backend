# 🚀 RBAC Quick Reference

## 📝 Commands to Run

```bash
# 1. Install dependencies
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# 2. Run migration
npx prisma migrate dev --name add_rbac_and_email_verification

# 3. Seed roles and permissions
npx ts-node prisma/seed.ts

# 4. Generate Prisma Client
npx prisma generate

# 5. Start server
npm run start:dev
```

---

## 🎯 Permission Quick Lookup

| Role | Permissions | Count |
|------|------------|-------|
| **USER** | create_own, read_own, update_own | 10 |
| **ADMIN** | create_all, delete_all, approve_all | 8 |
| **SUPER_ADMIN** | ALL permissions + role management | 32 |

---

## 💻 Code Templates

### Protect a Route

```typescript
@Get('resource')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.USER_READ_ALL)
getResource() {
  return this.service.findAll();
}
```

### Get Current User

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: AuthUser) {
  return user; // { id, email, roles, permissions }
}
```

### Assign Role to User

```typescript
// In any service
await this.rbacService.assignRoleToUser(userId, RoleName.ADMIN);
```

### Check Permission

```typescript
const hasPermission = await this.rbacService.userHasPermission(
  userId,
  PermissionKey.USER_DELETE_ALL
);
```

---

## 🔍 Test API Calls

### Register
```http
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "accountType": "INVESTOR"
}
```

### Login
```http
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Own Profile (USER)
```http
GET /users/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get All Users (ADMIN only)
```http
GET /users
Authorization: Bearer ADMIN_JWT_TOKEN
```

### Delete User (ADMIN only)
```http
DELETE /users/123
Authorization: Bearer ADMIN_JWT_TOKEN
```

---

## 🗂️ File Structure Created

```
libs/common/src/constants/
  └── permissions.constant.ts      # All permission & role definitions

src/auth/
  ├── auth.module.ts                # Auth module with JWT
  ├── auth.service.ts               # Register, login, verify email
  ├── auth.controller.ts            # Auth endpoints
  ├── rbac.service.ts               # Role & permission management
  ├── decorators/
  │   ├── permissions.decorator.ts  # @RequirePermissions()
  │   └── current-user.decorator.ts # @CurrentUser()
  ├── guards/
  │   ├── permissions.guard.ts      # Permission check logic
  │   └── jwt-auth.guard.ts         # JWT validation
  └── strategies/
      └── jwt.strategy.ts           # JWT passport strategy

src/user/
  ├── user.controller.ts            # Protected user routes
  ├── user.service.ts               # User business logic
  └── user.module.ts                # Updated with AuthModule

prisma/
  ├── schema.prisma                 # Updated with RBAC models
  └── seed.ts                       # Seeds roles & permissions

RBAC_SETUP_GUIDE.md                # Full documentation (you are here)
```

---

## 🔑 Environment Variables

```env
# Add to .env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## ✅ Verification Steps

1. ✅ Run migration → Check database for Role, Permission tables
2. ✅ Run seed → Check database for 3 roles, 32 permissions
3. ✅ Register user → Should get JWT with permissions
4. ✅ Login → Should return user + roles + permissions
5. ✅ Access `/users/me` → Should work for USER role
6. ✅ Access `/users` → Should FAIL (403) for USER role
7. ✅ Assign ADMIN role → User should now access `/users`

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Cannot find module '@app/common' | Add path alias in tsconfig.json |
| 403 Forbidden | Check user has required permission |
| 401 Unauthorized | Check JWT token is valid & not expired |
| Seed fails | Check database connection & schema is migrated |

---

## 📚 Key Files to Review

1. [permissions.constant.ts](libs/common/src/constants/permissions.constant.ts) - All permissions
2. [permissions.guard.ts](src/auth/guards/permissions.guard.ts) - How auth works
3. [user.controller.ts](src/user/user.controller.ts) - Real usage examples
4. [seed.ts](prisma/seed.ts) - How roles are populated
