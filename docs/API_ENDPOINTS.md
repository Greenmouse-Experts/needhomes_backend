# API Endpoints Quick Reference

## Authentication Endpoints

### 1. Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "accountType": "INDIVIDUAL"
}

Response: { message, otp (dev only) }
```

### 2. Verify Email (Creates Session)
```http
POST /auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "deviceInfo": {
    "deviceName": "iPhone 13",
    "platform": "iOS",
    "appVersion": "1.0.0"
  }
}

Response: { user, accessToken, refreshToken, sessionId }
```

### 3. Resend OTP
```http
POST /auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: { message, otp (dev only) }
```

### 4. Login (Creates Session)
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceInfo": {
    "deviceName": "Chrome Browser",
    "platform": "Web",
    "userAgent": "Mozilla/5.0..."
  }
}

Response: { user, accessToken, refreshToken, sessionId }
```

### 5. Refresh Access Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}

Response: { accessToken, refreshToken }
```

### 6. Get Current User Profile
```http
GET /auth/profile
Authorization: Bearer <accessToken>

Response: { id, email, firstName, lastName, roles, permissions }
```

## Session Management Endpoints

### 7. Get All Active Sessions
```http
GET /auth/sessions
Authorization: Bearer <accessToken>

Response: { userId, sessions: [...] }
```

### 8. Logout from Specific Device
```http
DELETE /auth/sessions/:sessionId
Authorization: Bearer <accessToken>

Response: { message }
```

### 9. Logout from All Devices
```http
DELETE /auth/sessions
Authorization: Bearer <accessToken>

Response: { message }
```

## Role Management Endpoints (SUPER_ADMIN only)

### 10. Assign Role to User
```http
POST /auth/roles/assign
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "userId": 123,
  "roleName": "ADMIN"
}

Response: { message }
Permission Required: role.assign
```

### 11. Remove Role from User
```http
DELETE /auth/roles/remove
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "userId": 123,
  "roleName": "ADMIN"
}

Response: { message }
Permission Required: role.assign
```

### 12. Get User Roles & Permissions
```http
GET /auth/roles/user/:userId
Authorization: Bearer <accessToken>

Response: { userId, roles, permissions }
Permission Required: role.read
```

## User Management Endpoints

### 13. Create User (ADMIN+)
```http
POST /users
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "accountType": "INDIVIDUAL"
}

Response: { user }
Permission Required: user.create_all
```

### 14. Get All Users (ADMIN+)
```http
GET /users
Authorization: Bearer <accessToken>

Response: [users...]
Permission Required: user.read_all
```

### 15. Get User by ID
```http
GET /users/:id
Authorization: Bearer <accessToken>

Response: { user }
Permission Required: user.read_own (own) or user.read_all (any)
```

### 16. Update User
```http
PATCH /users/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "firstName": "Updated Name"
}

Response: { user }
Permission Required: user.update_own (own) or user.update_all (any)
```

### 17. Delete User (ADMIN+)
```http
DELETE /users/:id
Authorization: Bearer <accessToken>

Response: { user }
Permission Required: user.delete_all
```

## Permission Structure

### USER Role
- `user.create_own` - Create their own user profile
- `user.read_own` - Read their own user data
- `user.update_own` - Update their own user data
- `user.delete_own` - Delete their own user account

### ADMIN Role
All USER permissions plus:
- `user.create_all` - Create any user
- `user.read_all` - Read any user data
- `user.update_all` - Update any user data
- `user.delete_all` - Delete any user
- `role.read` - View roles and permissions

### SUPER_ADMIN Role
All ADMIN permissions plus:
- `role.assign` - Assign/remove roles
- `role.create` - Create new roles (future)
- `role.update` - Update role permissions (future)
- `role.delete` - Delete roles (future)
- `permission.manage` - Manage all permissions (future)
- All other permissions...

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "accountType": "INDIVIDUAL"
  }'

# Verify Email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "deviceInfo": {"deviceName": "Test Device", "platform": "Test"}
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "deviceInfo": {"deviceName": "Test Device", "platform": "Test"}
  }'

# Get Profile
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get Sessions
curl -X GET http://localhost:3000/auth/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import collection from the above cURL examples
2. Create environment variable for `accessToken`
3. Add to Authorization header: `Bearer {{accessToken}}`

## Notes

- All timestamps are in ISO 8601 format
- Access tokens expire in 7 days
- Refresh tokens expire in 30 days
- Sessions expire in 30 days
- OTPs expire in 5 minutes
- Maximum 5 OTP attempts before lockout
