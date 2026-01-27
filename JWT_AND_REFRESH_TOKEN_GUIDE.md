# JWT Authorization & Refresh Token Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Token Structure](#token-structure)
4. [API Endpoints](#api-endpoints)
5. [Implementation Guide for Frontend](#implementation-guide-for-frontend)
6. [Token Storage & Security](#token-storage--security)
7. [Handling Expired Tokens](#handling-expired-tokens)
8. [Session Management](#session-management)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Overview

The NeedHomes backend uses a **JWT (JSON Web Token) + Refresh Token** authentication pattern. This is an industry-standard approach that balances security with user experience:

- **Access Token (JWT)**: Short-lived token (1 hour) used to authenticate API requests
- **Refresh Token**: Long-lived token (30 days) used to obtain new access tokens without re-logging in
- **Session ID**: Unique identifier for each device/login session, allowing multi-device management

### Why Two Tokens?

| Aspect | Access Token | Refresh Token |
|--------|--------------|---------------|
| **Expiration** | 1 hour | 30 days |
| **Purpose** | Authenticate API requests | Obtain new access token |
| **Storage** | Memory (secure) | HTTP-only cookie or secure storage |
| **Risk** | Low (short-lived) | Higher (long-lived) |
| **Usage** | Every API request | Once per hour |

---

## Authentication Flow

### 1. Registration & Email Verification

```
User Registration
    ↓
OTP sent to email (stored in Redis, 5-minute expiry)
    ↓
User verifies email with OTP
    ↓
User automatically logged in (tokens generated)
```

**Response includes:**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": true,
    "AccountType": "INDIVIDUAL"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3d4e5f6...",
  "sessionId": "uuid"
}
```

### 2. Login Flow

```
User provides credentials (email + password)
    ↓
Backend validates email/password
    ↓
Backend checks email verification status
    ↓
Backend generates tokens & creates session
    ↓
Tokens returned to frontend
```

**Response includes:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "INDIVIDUAL",
    "isEmailVerified": true,
    "roles": ["USER"],
    "permissions": ["user.read_own", "user.update_own"]
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3d4e5f6...",
  "sessionId": "uuid"
}
```

### 3. Authenticated API Request Flow

```
Frontend makes API request
    ↓
Includes Authorization header: "Bearer <accessToken>"
    ↓
Backend validates JWT signature & expiration
    ↓
Backend checks session validity
    ↓
Backend verifies user exists & is active
    ↓
Backend loads user roles & permissions from cache
    ↓
Request proceeds with user data attached
```

### 4. Token Refresh Flow

```
Access token expires (401 response)
    ↓
Frontend detects 401 error
    ↓
Frontend sends refresh token to /auth/refresh endpoint
    ↓
Backend validates refresh token in Redis
    ↓
Backend generates new access token (same session)
    ↓
Backend may generate new refresh token (if rotation enabled)
    ↓
Frontend retries original request with new token
```

---

## Token Structure

### Access Token (JWT)

The access token is a **JWT** with three parts separated by dots: `header.payload.signature`

**Payload example (decoded):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "email": "user@example.com",
  "roles": ["USER", "INVESTOR"],
  "permissions": ["user.read_own", "user.update_own", "property.read"],
  "sessionId": "550e8400-e29b-41d4-a716-446655440001",
  "iat": 1706262000,                               // Issued at
  "exp": 1706265600                                // Expires in 1 hour
}
```

**Key Points:**
- Contains user ID (`sub`), email, roles, permissions, and session ID
- **Signed** with a secret key (impossible to forge without the key)
- **Not encrypted** (anyone can read the payload, but can't modify it)
- Expires in **1 hour**
- Contains everything needed to make authenticated API calls

### Refresh Token

A **random 64-character hexadecimal string** stored in Redis:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Stored in Redis with:**
```
Key: "refresh_token:<random-string>"
Value: {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  sessionId: "550e8400-e29b-41d4-a716-446655440001",
  deviceInfo: {
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    timestamp: "2024-01-26T10:00:00Z"
  }
}
Expiry: 30 days
```

**Key Points:**
- **Random & non-repeating** (cryptographically secure)
- **Only stored in Redis** (not in database for security)
- Expires in **30 days**
- Cannot be decoded like JWT; must be validated against Redis
- Can be revoked immediately by deleting from Redis

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User
```
POST /auth/register?accountType=INDIVIDUAL
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

Response (201):
{
  "message": "Registration successful. Please verify your email with the OTP sent.",
  "email": "user@example.com",
  "userId": "uuid",
  "accountType": "INDIVIDUAL",
  "otp": "123456" // Only in development
}
```

#### 2. Verify Email with OTP
```
POST /auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}

Response (200):
{
  "message": "Email verified successfully",
  "user": {...},
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3d4e5f6...",
  "sessionId": "uuid"
}
```

#### 3. Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "user": {...},
  "accessToken": "eyJhbGc...",
  "refreshToken": "a1b2c3d4e5f6...",
  "sessionId": "uuid"
}

Response (403) - Email not verified:
{
  "message": "Email not verified. A new verification code has been sent to your email.",
  "statusCode": 403,
  "error": "Forbidden"
}
```

#### 4. Refresh Access Token
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}

Response (200):
{
  "accessToken": "eyJhbGc...", // New JWT token
  "refreshToken": "new1a2b3c4d5e..." // May be rotated
}

Response (401):
{
  "message": "Invalid refresh token",
  "statusCode": 401,
  "error": "Unauthorized"
}
```

#### 5. Get Current User Profile (Protected)
```
GET /auth/profile
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "accountType": "INDIVIDUAL",
  "isEmailVerified": true,
  "sessionId": "uuid",
  "type": "user",
  "roles": ["USER"],
  "permissions": ["user.read_own", "user.update_own"]
}

Response (401):
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

#### 6. Get All Active Sessions
```
GET /auth/sessions
Authorization: Bearer <accessToken>

Response (200):
{
  "userId": "uuid",
  "sessions": [
    {
      "sessionId": "uuid",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-26T10:00:00Z"
    },
    {
      "sessionId": "uuid2",
      "ip": "192.168.1.2",
      "userAgent": "Chrome on iPhone...",
      "timestamp": "2024-01-25T15:30:00Z"
    }
  ]
}
```

#### 7. Logout from Specific Session
```
DELETE /auth/sessions/<sessionId>
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Session logged out successfully"
}
```

#### 8. Logout from All Devices
```
DELETE /auth/sessions
Authorization: Bearer <accessToken>

Response (200):
{
  "message": "Logged out from all devices successfully"
}
```

#### 9. Request Password Reset
```
POST /auth/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}

Response (200):
{
  "message": "Password reset OTP sent to your email"
}
```

#### 10. Verify Password Reset OTP
```
POST /auth/password/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}

Response (200):
{
  "message": "OTP verified",
  "resetToken": "reset_token_string",
  "expiresIn": 600 // 10 minutes
}
```

#### 11. Reset Password
```
POST /auth/password/reset
Content-Type: application/json

{
  "token": "reset_token_string",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

Response (200):
{
  "message": "Password reset successfully"
}
```

---

## Implementation Guide for Frontend

### 1. TypeScript/JavaScript HTTP Client Setup

#### Using Axios
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    accountType: string;
    isEmailVerified: boolean;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

class AuthService {
  private api: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach access token
    this.api.interceptors.request.use(
      (config) => {
        if (this.tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleTokenRefresh(error)
    );

    // Load tokens from storage on initialization
    this.loadTokensFromStorage();
  }

  /**
   * Handle 401 responses by attempting to refresh the token
   */
  private async handleTokenRefresh(error: AxiosError): Promise<any> {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const newTokens = await this.refreshTokens();
        this.tokens = newTokens;
        this.saveTokensToStorage(newTokens);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }
        return this.api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        this.logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    accountType: 'INDIVIDUAL' | 'CORPORATE'
  ) {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
      phone,
      ...(accountType === 'CORPORATE' && { companyName: 'Company Name' }),
    }, {
      params: { accountType },
    });
    return response.data;
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email: string, otp: string) {
    const response = await this.api.post<AuthResponse>('/auth/verify-email', {
      email,
      otp,
    });
    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      sessionId: response.data.sessionId,
    };
    this.saveTokensToStorage(this.tokens);
    return response.data;
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const response = await this.api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      sessionId: response.data.sessionId,
    };
    this.saveTokensToStorage(this.tokens);
    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshTokens(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.api.post('/auth/refresh', {
      refreshToken: this.tokens.refreshToken,
    });

    // Update tokens
    this.tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken || this.tokens.refreshToken,
      sessionId: this.tokens.sessionId,
    };

    return this.tokens;
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  /**
   * Get all active sessions
   */
  async getSessions() {
    const response = await this.api.get('/auth/sessions');
    return response.data;
  }

  /**
   * Logout from specific session
   */
  async logoutSession(sessionId: string) {
    await this.api.delete(`/auth/sessions/${sessionId}`);
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices() {
    await this.api.delete('/auth/sessions');
  }

  /**
   * Clear tokens and logout
   */
  logout() {
    this.tokens = null;
    localStorage.removeItem('authTokens');
    sessionStorage.removeItem('authTokens');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Save tokens to local/session storage
   */
  private saveTokensToStorage(tokens: AuthTokens) {
    // Option 1: Use localStorage (persists across browser sessions)
    localStorage.setItem('authTokens', JSON.stringify(tokens));

    // Option 2: Use sessionStorage (cleared on browser close)
    // sessionStorage.setItem('authTokens', JSON.stringify(tokens));
  }

  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage() {
    const stored = localStorage.getItem('authTokens');
    // const stored = sessionStorage.getItem('authTokens');

    if (stored) {
      try {
        this.tokens = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse stored tokens', error);
        this.tokens = null;
      }
    }
  }
}

export default AuthService;
```

#### Using React Hooks
```typescript
import { useState, useCallback, useEffect } from 'react';

const useAuth = (baseURL: string = 'http://localhost:3000') => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = new AuthService(baseURL);

  // Load user from localStorage on mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      loadProfile();
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    accountType: 'INDIVIDUAL' | 'CORPORATE'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.register(
        email,
        password,
        firstName,
        lastName,
        phone,
        accountType
      );
      return result;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.verifyEmail(email, otp);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Email verification failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authService]);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, [authService]);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      setIsAuthenticated(true);
    } catch (err) {
      logout();
    }
  }, [authService]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    register,
    verifyEmail,
    login,
    logout,
    loadProfile,
  };
};

export default useAuth;
```

### 2. Making Protected API Calls

```typescript
// Once authenticated, use the authService instance to make requests
// It automatically attaches the access token

// Example: Fetching user data
const userData = await authService.api.get('/users/profile');

// Example: Creating a property (if you have this endpoint)
const newProperty = await authService.api.post('/properties', {
  title: 'Apartment for rent',
  description: 'Nice 2-bedroom apartment',
  price: 1000,
});

// Example: Updating user profile
const updatedUser = await authService.api.patch('/users/profile', {
  firstName: 'Jane',
  lastName: 'Smith',
});
```

---

## Token Storage & Security

### Recommended Storage Options

#### 1. **localStorage** (Persistent)
```typescript
// Pros:
// - Persists across browser sessions
// - User doesn't need to re-login after page refresh

// Cons:
// - Vulnerable to XSS (Cross-Site Scripting)
// - Accessible via JavaScript

localStorage.setItem('authTokens', JSON.stringify({
  accessToken: '...',
  refreshToken: '...',
  sessionId: '...'
}));
```

#### 2. **sessionStorage** (Session-Only)
```typescript
// Pros:
// - Cleared on browser close
// - More secure than localStorage

// Cons:
// - Lost on page refresh
// - User loses session

sessionStorage.setItem('authTokens', JSON.stringify({...}));
```

#### 3. **Memory (Most Secure)**
```typescript
// Pros:
// - No XSS vulnerability
// - Most secure option

// Cons:
// - Lost on page refresh
// - Not suitable for persistent login

let authTokens = null; // Store in memory
```

#### 4. **HTTP-Only Cookies (Backend-Set)**
```typescript
// Backend sets:
// Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Strict
// Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict

// Pros:
// - Most secure for web apps
// - Not accessible via JavaScript (XSS safe)
// - Browser sends automatically

// Cons:
// - Requires backend support
// - CORS configuration needed
```

### Recommended Approach

**Hybrid Strategy: localStorage + sessionStorage**
```typescript
// For "Remember Me" functionality:
// - If user checks "Remember Me": use localStorage
// - If user doesn't: use sessionStorage

interface LoginOptions {
  rememberMe?: boolean;
}

function saveTokens(tokens: AuthTokens, options: LoginOptions) {
  const storage = options.rememberMe ? localStorage : sessionStorage;
  storage.setItem('authTokens', JSON.stringify(tokens));
}
```

### XSS Protection Tips

1. **Never store sensitive data in localStorage unnecessarily**
   ```typescript
   // ❌ Bad
   localStorage.setItem('password', 'mypassword');

   // ✅ Good
   // Never store plaintext passwords
   ```

2. **Use Content Security Policy (CSP)**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self'">
   ```

3. **Sanitize user inputs**
   ```typescript
   // ❌ Bad
   element.innerHTML = userInput;

   // ✅ Good
   element.textContent = userInput; // or use a library like DOMPurify
   ```

4. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

---

## Handling Expired Tokens

### Automatic Token Refresh

The axios interceptor automatically handles token refresh:

```typescript
// Request fails with 401 (token expired)
    ↓
// Interceptor detects 401
    ↓
// Sends refresh token to /auth/refresh
    ↓
// Receives new access token
    ↓
// Retries original request with new token
    ↓
// Request succeeds
```

### Manual Token Check

```typescript
import jwtDecode from 'jwt-decode';

function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
}

// Check before making critical requests
if (isTokenExpired(authService.getAccessToken()!)) {
  // Token is expired, refresh it
  await authService.refreshTokens();
}
```

### UI/UX Considerations

```typescript
// Show warning before token expires
const TOKEN_EXPIRY_WARNING_TIME = 5 * 60 * 1000; // 5 minutes

function showExpiryWarning(token: string) {
  const decoded: any = jwtDecode(token);
  const expiresAt = decoded.exp * 1000;
  const now = Date.now();
  const timeRemaining = expiresAt - now;

  if (timeRemaining < TOKEN_EXPIRY_WARNING_TIME && timeRemaining > 0) {
    showNotification('Your session will expire soon. Please refresh.');
  }
}
```

---

## Session Management

### Multi-Device Support

Users can be logged in on multiple devices simultaneously:

```typescript
// Get all active sessions
const sessions = await authService.getSessions();

// Response:
{
  "userId": "uuid",
  "sessions": [
    {
      "sessionId": "uuid-device-1",
      "ip": "192.168.1.100",
      "userAgent": "Chrome on Windows",
      "timestamp": "2024-01-26T10:00:00Z"
    },
    {
      "sessionId": "uuid-device-2",
      "ip": "10.0.0.50",
      "userAgent": "Safari on iPhone",
      "timestamp": "2024-01-25T15:30:00Z"
    }
  ]
}
```

### Logout from Specific Device

```typescript
// User can logout from any device
await authService.logoutSession('uuid-device-1');

// This device's tokens become invalid immediately
// Other devices remain logged in
```

### Logout from All Devices

```typescript
// Emergency logout - clears all sessions
await authService.logoutAllDevices();

// All devices must re-login
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "message": "Invalid email format",
  "statusCode": 400,
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "message": "Invalid credentials",
  "statusCode": 401,
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "message": "Email not verified",
  "statusCode": 403,
  "error": "Forbidden"
}
```

#### 409 Conflict
```json
{
  "message": "Email already registered",
  "statusCode": 409,
  "error": "Conflict"
}
```

### Comprehensive Error Handling

```typescript
async function handleApiError(error: AxiosError) {
  if (!error.response) {
    // Network error
    console.error('Network error:', error.message);
    showNotification('Network error. Please check your connection.');
    return;
  }

  const { status, data } = error.response;

  switch (status) {
    case 400:
      // Validation error
      const validationError = data as { message: string };
      showNotification(`Validation Error: ${validationError.message}`);
      break;

    case 401:
      // Unauthorized - try token refresh
      if (authService.isAuthenticated()) {
        try {
          await authService.refreshTokens();
          // Retry request
        } catch (refreshError) {
          // Refresh failed - logout
          authService.logout();
          redirectToLogin();
        }
      }
      break;

    case 403:
      // Forbidden - insufficient permissions
      showNotification('You do not have permission to perform this action.');
      break;

    case 409:
      // Conflict - duplicate resource
      const conflictError = data as { message: string };
      showNotification(`Conflict: ${conflictError.message}`);
      break;

    case 500:
      // Server error
      showNotification('Server error. Please try again later.');
      break;

    default:
      showNotification(`Error: ${data.message || 'Unknown error'}`);
  }
}
```

---

## Best Practices

### 1. **Always Include the Authorization Header**
```typescript
// ✅ Correct
const response = await authService.api.get('/protected-endpoint');
// Access token is automatically included by interceptor

// ❌ Incorrect
const response = await axios.get('http://api.example.com/protected-endpoint');
// No token included!
```

### 2. **Use Environment Variables for API URLs**
```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const authService = new AuthService(API_URL);
```

### 3. **Implement Graceful Token Expiry Handling**
```typescript
// Don't let users lose work due to token expiry
// Automatically refresh before they know it's expired

// Option 1: Periodic refresh
setInterval(() => {
  if (authService.isAuthenticated()) {
    authService.refreshTokens().catch(() => {
      // Silently handle refresh failure
    });
  }
}, 50 * 60 * 1000); // Every 50 minutes
```

### 4. **Secure Logout**
```typescript
async function secureLogout() {
  try {
    // Notify backend to invalidate session
    await authService.logoutAllDevices();
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Clear local data regardless
    authService.logout();
    redirectToLogin();
  }
}
```

### 5. **Handle Token Refresh Edge Cases**
```typescript
// Prevent multiple simultaneous refresh attempts
let refreshPromise: Promise<AuthTokens> | null = null;

async function getValidToken(): Promise<string> {
  if (isTokenExpired(authService.getAccessToken()!)) {
    if (!refreshPromise) {
      refreshPromise = authService.refreshTokens()
        .finally(() => {
          refreshPromise = null;
        });
    }
    await refreshPromise;
  }
  return authService.getAccessToken()!;
}
```

### 6. **Log Important Auth Events**
```typescript
// Track auth events for debugging and security monitoring
function logAuthEvent(event: string, details: any) {
  console.log(`[AUTH] ${event}:`, {
    timestamp: new Date().toISOString(),
    ...details,
  });
  
  // Optionally send to analytics/logging service
  // analytics.trackEvent(event, details);
}

// Usage:
await authService.login(email, password);
logAuthEvent('LOGIN_SUCCESS', { email, sessionId });
```

### 7. **Implement Proper CORS Configuration**
```typescript
// Frontend must set CORS headers correctly
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 8. **Test Token Refresh Mechanism**
```typescript
// Manually test token refresh
async function testTokenRefresh() {
  const originalToken = authService.getAccessToken();
  
  // Call refresh
  const newTokens = await authService.refreshTokens();
  
  console.assert(
    newTokens.accessToken !== originalToken,
    'Token should be different after refresh'
  );
  
  console.assert(
    authService.isAuthenticated(),
    'Should still be authenticated after refresh'
  );
}
```

### 9. **Implement Rate Limiting for Auth Endpoints**
```typescript
// Prevent brute force attacks
const authAttempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempts = authAttempts.get(email) || [];
  
  // Remove old attempts
  const recentAttempts = attempts.filter(t => now - t < TIME_WINDOW);
  
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false; // Rate limited
  }
  
  recentAttempts.push(now);
  authAttempts.set(email, recentAttempts);
  return true;
}

// Usage:
async function login(email: string, password: string) {
  if (!checkRateLimit(email)) {
    showNotification('Too many login attempts. Please try again later.');
    return;
  }
  
  return authService.login(email, password);
}
```

### 10. **Monitor Session Activity**
```typescript
// Track user activity to detect suspicious behavior
class SessionMonitor {
  private lastActivityTime = Date.now();

  recordActivity() {
    this.lastActivityTime = Date.now();
  }

  isSessionStale(timeoutMinutes: number = 30): boolean {
    const now = Date.now();
    const elapsedMinutes = (now - this.lastActivityTime) / (60 * 1000);
    return elapsedMinutes > timeoutMinutes;
  }

  setupIdleLogout(timeoutMinutes: number = 30) {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      this.recordActivity();

      idleTimer = setTimeout(() => {
        // Auto logout due to inactivity
        authService.logout();
        showNotification('Session expired due to inactivity');
      }, timeoutMinutes * 60 * 1000);
    };

    // Reset timer on user activity
    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keypress', resetTimer);
    document.addEventListener('click', resetTimer);

    resetTimer();
  }
}
```

---

## Summary

| Step | What Happens |
|------|--------------|
| **Register** | User registers → OTP sent → Email verified → Auto-login |
| **Login** | Credentials validated → Tokens generated → User logged in |
| **Make Requests** | Include access token in `Authorization: Bearer <token>` header |
| **Token Expires** | Get 401 error → Automatically refresh → Retry request |
| **Logout** | Clear tokens & sessions → User redirected to login |
| **Multi-Device** | Each device has unique sessionId → Can logout per-device |

The JWT + Refresh Token pattern provides:
- ✅ Secure authentication
- ✅ Better performance (no database lookups on every request)
- ✅ Stateless API (easier to scale)
- ✅ Multi-device support
- ✅ Fine-grained permission control (RBAC)

