# 🔐 RBAC System - Complete Implementation

## 🎯 Overview

This directory contains a **production-ready Role-Based Access Control (RBAC) system** for your NestJS + Prisma application.

### ✅ What You Get

- **3 Roles**: USER, ADMIN, SUPER_ADMIN
- **32 Permissions**: Fine-grained access control (create_own, update_own, delete_all, etc.)
- **JWT Authentication**: Secure token-based authentication with permissions embedded
- **Permission Guards**: Declarative route protection using `@RequirePermissions()`
- **Email Verification**: Added `isEmailVerified` field to User model
- **Complete Documentation**: Setup guides, quick reference, and testing scripts

---

## 📋 Quick Start

### 1. Install Dependencies
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

### 2. Configure Environment
Add to `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

### 3. Run Migration
```bash
npm run prisma:migrate
# Enter: add_rbac_and_email_verification
```

### 4. Seed Database
```bash
npm run prisma:seed
```

### 5. Start & Test
```bash
npm run start:dev
node test-rbac.js  # Run automated tests
```

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| [RBAC_COMPLETE.md](RBAC_COMPLETE.md) | ✅ **START HERE** - Complete summary |
| [INSTALLATION_STEPS.md](INSTALLATION_STEPS.md) | Step-by-step installation guide |
| [RBAC_SETUP_GUIDE.md](RBAC_SETUP_GUIDE.md) | Full technical documentation |
| [RBAC_QUICK_REFERENCE.md](RBAC_QUICK_REFERENCE.md) | Quick reference cheatsheet |
| [test-rbac.js](test-rbac.js) | Automated test script |

---

## 🎯 Permission Structure

### USER Role (10 permissions)
- Can manage **only their own** resources
- Permissions: `create_own`, `read_own`, `update_own`

### ADMIN Role (8 permissions)
- Can manage **all** resources
- Permissions: `create_all`, `read_all`, `update_all`, `delete_all`
- Can approve/reject verification documents

### SUPER_ADMIN Role (32 permissions)
- Has **ALL** permissions
- Can manage roles and system settings

---

## 💻 Usage Example

```typescript
// Protect a route
@Delete(':id')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.USER_DELETE_ALL)
deleteUser(@Param('id') id: number) {
  return this.userService.softDelete(id);
}

// Get current user
@Get('me')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: AuthUser) {
  return user; // { id, email, roles, permissions }
}
```

---

## 🔑 API Endpoints

### Public Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login

### Protected Endpoints (USER)
- `GET /users/me` - Get own profile
- `PUT /users/me` - Update own profile
- `DELETE /users/me` - Delete own account

### Protected Endpoints (ADMIN+)
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

---

## 🗂️ Project Structure

```
src/
├── auth/                           # Authentication & Authorization
│   ├── auth.module.ts              # Auth module with JWT
│   ├── auth.service.ts             # Register, login, verify
│   ├── auth.controller.ts          # Auth endpoints
│   ├── rbac.service.ts             # Role & permission management
│   ├── dto/
│   │   └── auth.dto.ts             # DTOs with validation
│   ├── decorators/
│   │   ├── permissions.decorator.ts # @RequirePermissions()
│   │   └── current-user.decorator.ts # @CurrentUser()
│   ├── guards/
│   │   ├── permissions.guard.ts    # Permission check logic
│   │   └── jwt-auth.guard.ts       # JWT validation
│   └── strategies/
│       └── jwt.strategy.ts         # JWT Passport strategy
│
├── user/                           # User module
│   ├── user.controller.ts          # Protected routes
│   ├── user.service.ts             # Business logic
│   └── dto/
│       └── update-user.dto.ts      # User DTOs
│
libs/common/src/constants/
└── permissions.constant.ts         # All permissions defined here

prisma/
├── schema.prisma                   # RBAC models added
└── seed.ts                         # Seeds roles & permissions
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Migration applied (Role, Permission tables exist)
- [ ] Seed ran successfully (3 roles, 32 permissions)
- [ ] Can register a user
- [ ] User gets USER role automatically
- [ ] Can login and receive JWT with permissions
- [ ] Can access `/users/me` with USER role
- [ ] Cannot access `/users` with USER role (403)
- [ ] After promoting to ADMIN, can access `/users`

Run `node test-rbac.js` to automatically verify all checks.

---

## 🔐 Security Features

✅ Password hashing with bcrypt  
✅ JWT tokens with expiration  
✅ Permission-based authorization  
✅ Soft delete support  
✅ Account status verification  
✅ Email verification ready  
✅ Type-safe DTOs with validation  

---

## 🚀 Production Ready

This implementation follows industry best practices:

1. **Scalable**: Add roles/permissions without code changes
2. **Maintainable**: Centralized permission definitions
3. **Secure**: Multi-layer security (JWT + Permissions + Guards)
4. **Testable**: Comprehensive test script included
5. **Documented**: Full documentation with examples

---

## 📖 Need Help?

1. **Start Here**: [RBAC_COMPLETE.md](RBAC_COMPLETE.md)
2. **Installation**: [INSTALLATION_STEPS.md](INSTALLATION_STEPS.md)
3. **API Usage**: [RBAC_QUICK_REFERENCE.md](RBAC_QUICK_REFERENCE.md)
4. **Full Guide**: [RBAC_SETUP_GUIDE.md](RBAC_SETUP_GUIDE.md)

---

## 🎉 Summary

Your RBAC system is **100% complete and production-ready**!

**Key Files**:
- Permissions: [permissions.constant.ts](libs/common/src/constants/permissions.constant.ts)
- Guards: [permissions.guard.ts](src/auth/guards/permissions.guard.ts)
- Examples: [user.controller.ts](src/user/user.controller.ts)

**Remember**:
- USER = can only manage own resources (create_own, update_own)
- ADMIN = can manage all resources (create_all, delete_all)
- SUPER_ADMIN = has ALL 32 permissions

Happy coding! 🚀
