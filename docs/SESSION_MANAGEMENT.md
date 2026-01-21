# Session Management System

## Overview

This project implements a **JWT + Redis Session Tracking** authentication system that works seamlessly for both **mobile apps** and **web applications**. This hybrid approach combines the benefits of stateless JWT tokens with the control of session management.

## Why This Approach?

### Problems with Pure Session-Based Auth for Mobile
- ❌ Cookies don't work well in mobile apps (React Native, Flutter, etc.)
- ❌ Requires complex cookie management across platforms
- ❌ Session cookies can be tricky with native HTTP clients

### Benefits of JWT + Session Tracking
- ✅ **Stateless JWT** works everywhere (mobile, web, desktop)
- ✅ **Session tracking** allows token revocation
- ✅ **Device tracking** - see all active sessions
- ✅ **Remote logout** - logout from any device
- ✅ **Security** - can invalidate compromised tokens

## How It Works

```
┌─────────────┐
│   Client    │
│ (Mobile/Web)│
└──────┬──────┘
       │ 1. Login with credentials
       ▼
┌─────────────────────────────────┐
│       Auth Service              │
│  • Verify credentials           │
│  • Generate JWT (7 days)        │
│  • Generate Refresh Token (30d) │
│  • Create Session ID (UUID)     │
└──────┬──────────────────────────┘
       │
       │ 2. Store in Redis
       ▼
┌─────────────────────────────────┐
│       Redis Cache               │
│  • refresh:token -> sessionData │
│  • sessions:userId -> [sessions]│
└─────────────────────────────────┘
       │
       │ 3. Return tokens
       ▼
┌─────────────┐
│   Client    │
│ Stores:     │
│ • accessToken (JWT)  │
│ • refreshToken       │
│ • sessionId          │
└─────────────┘
```

## Token Structure

### Access Token (JWT - 7 days)
```json
{
  "sub": 123,              // User ID
  "email": "user@example.com",
  "roles": ["USER"],
  "permissions": ["user.create_own", "user.update_own"],
  "sessionId": "uuid-v4",  // Unique session identifier
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Refresh Token (Random String - 30 days)
- Stored in Redis: `refresh:${token}`
- Contains:
  ```json
  {
    "userId": 123,
    "sessionId": "uuid-v4",
    "deviceInfo": {
      "deviceName": "iPhone 13",
      "platform": "iOS",
      "appVersion": "1.0.0"
    },
    "createdAt": "2025-01-21T10:00:00Z"
  }
  ```

### Session Tracking
- Stored in Redis: `sessions:${userId}`
- Contains array of all active sessions:
  ```json
  [
    {
      "sessionId": "uuid-v4",
      "deviceInfo": {...},
      "createdAt": "2025-01-21T10:00:00Z",
      "lastActive": "2025-01-21T12:30:00Z"
    }
  ]
  ```

## API Endpoints

### 1. Register
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
```

**Response:**
```json
{
  "message": "Registration successful. OTP sent to your email",
  "otp": "123456"  // Only in development
}
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
```

**Response:**
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["USER"],
    "permissions": ["user.create_own", "user.update_own"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 3. Login (Creates Session)
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
```

**Response:** Same as verify email

### 4. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new-refresh-token..."
}
```

### 5. Get Active Sessions
```http
GET /auth/sessions
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "userId": 123,
  "sessions": [
    {
      "sessionId": "uuid-1",
      "deviceInfo": {
        "deviceName": "iPhone 13",
        "platform": "iOS"
      },
      "createdAt": "2025-01-21T10:00:00Z",
      "lastActive": "2025-01-21T12:30:00Z"
    },
    {
      "sessionId": "uuid-2",
      "deviceInfo": {
        "deviceName": "Chrome Browser",
        "platform": "Web"
      },
      "createdAt": "2025-01-20T15:00:00Z",
      "lastActive": "2025-01-21T11:00:00Z"
    }
  ]
}
```

### 6. Logout Specific Device
```http
DELETE /auth/sessions/:sessionId
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Session logged out successfully"
}
```

### 7. Logout All Devices
```http
DELETE /auth/sessions
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

## Client Implementation

### Mobile (React Native / Flutter)

```typescript
// 1. Store tokens securely
import * as SecureStore from 'expo-secure-store';

async function handleLogin(email: string, password: string) {
  const deviceInfo = {
    deviceName: Device.deviceName,
    platform: Platform.OS,
    appVersion: Application.nativeApplicationVersion,
  };

  const response = await fetch('https://api.example.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceInfo }),
  });

  const data = await response.json();

  // Store tokens securely
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
  await SecureStore.setItemAsync('sessionId', data.sessionId);
}

// 2. Use access token in requests
async function makeAuthRequest(url: string, options: any = {}) {
  const accessToken = await SecureStore.getItemAsync('accessToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

// 3. Handle token refresh
async function refreshAccessToken() {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  
  const response = await fetch('https://api.example.com/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  // Update tokens
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
}
```

### Web (React / Next.js)

```typescript
// 1. Store tokens in localStorage or cookies
function handleLogin(email: string, password: string) {
  const deviceInfo = {
    deviceName: 'Web Browser',
    platform: 'Web',
    userAgent: navigator.userAgent,
  };

  fetch('https://api.example.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceInfo }),
  })
    .then(res => res.json())
    .then(data => {
      // Store in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('sessionId', data.sessionId);
    });
}

// 2. Use access token with axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
});

// Add token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      try {
        const { data } = await axios.post('https://api.example.com/auth/refresh', {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(error.config);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## Security Features

### 1. Session Validation
Every request with a JWT checks if the session still exists in Redis:
```typescript
// In JWT Strategy
if (sessionId) {
  const isValid = await this.cacheService.isSessionValid(userId, sessionId);
  if (!isValid) {
    throw new UnauthorizedException('Session expired or invalid');
  }
}
```

### 2. Device Tracking
Track which devices have active sessions:
```typescript
{
  "deviceInfo": {
    "deviceName": "iPhone 13",
    "platform": "iOS",
    "appVersion": "1.0.0",
    "ip": "192.168.1.1"
  }
}
```

### 3. Remote Logout
Invalidate tokens from any device:
```typescript
// Logout from specific device
DELETE /auth/sessions/:sessionId

// Logout from all devices
DELETE /auth/sessions
```

### 4. Automatic Cleanup
Sessions expire automatically after 30 days (Redis TTL).

## Best Practices

### 1. Token Storage
- **Mobile**: Use secure storage (Keychain/Keystore)
- **Web**: Use httpOnly cookies (preferred) or localStorage with XSS protection

### 2. Refresh Token Flow
- Access token: Short lived (7 days)
- Refresh token: Long lived (30 days)
- Refresh access token when expired

### 3. Device Info Collection
Always send device info on login:
```typescript
const deviceInfo = {
  deviceName: "User's iPhone",  // User-friendly name
  platform: "iOS",              // iOS, Android, Web
  appVersion: "1.0.0",          // App version
  userAgent: "...",             // Browser user agent (web only)
};
```

### 4. Error Handling
```typescript
try {
  const response = await api.get('/protected-route');
} catch (error) {
  if (error.response?.status === 401) {
    // Try refresh token
    await refreshAccessToken();
    // Retry request
  }
}
```

## Migration Path: Upgrading to Redis

Currently using in-memory cache. To upgrade to Redis:

### 1. Update docker-compose.yaml
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### 2. Update app.module.ts
```typescript
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Install Redis package
```bash
npm install cache-manager-redis-store
```

### 4. Update .env
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Monitoring & Debugging

### View Active Sessions
```typescript
// Get all sessions for a user
GET /auth/sessions
```

### Check Session in Redis
```bash
# Connect to Redis CLI
docker exec -it <redis-container> redis-cli

# View all sessions for user
GET sessions:123

# View refresh token
GET refresh:a1b2c3d4e5f6
```

## Troubleshooting

### "Session expired or invalid"
- Session was deleted (logout)
- Redis cache was cleared
- 30-day TTL expired

**Solution**: Refresh token or re-login

### "Invalid refresh token"
- Refresh token expired (30 days)
- Token was used to logout

**Solution**: User must login again

### Tokens not working on mobile
- Check if you're sending `Authorization: Bearer <token>` header
- Verify token is stored securely
- Check token hasn't expired

## Summary

This authentication system provides:
- ✅ **Universal compatibility** (mobile + web)
- ✅ **Stateless JWTs** for scalability
- ✅ **Session tracking** for security
- ✅ **Device management** for user control
- ✅ **Token revocation** capabilities
- ✅ **Easy to upgrade** to Redis in production

Perfect for modern full-stack applications! 🚀
