# JWT Authorization Guide

## Overview

This guide explains how to authorize API requests using JWT (JSON Web Tokens) and handle token refreshes when tokens expire.

---

## What is JWT?

JWT is a stateless authentication token that allows you to prove your identity to the API without the backend needing to look up your session in a database.

**Structure:** `header.payload.signature`

Example decoded JWT payload:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "email": "user@example.com",
  "roles": ["USER"],
  "permissions": ["user.read_own", "user.update_own"],
  "sessionId": "550e8400-e29b-41d4-a716-446655440001",
  "iat": 1706262000,      // Issued at (current time)
  "exp": 1706265600       // Expires in 1 hour
}
```

**Key Points:**
- ✅ Contains user ID, email, roles, and permissions
- ✅ Signed with a secret key (can't be forged)
- ✅ Not encrypted (payload is readable, but can't be modified)
- ✅ Expires in **1 hour**

---

## How to Use JWT for Authorization

### 1. Get a JWT Token

After logging in or registering, you'll receive tokens:

```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 2. Include JWT in Every Request

Add the JWT to the `Authorization` header as a Bearer token:

```
GET /auth/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Backend Validates the Token

The backend:
1. Extracts the JWT from the `Authorization` header
2. Verifies the signature (ensures it wasn't tampered with)
3. Checks if it's expired
4. Validates the session is still active
5. Loads your roles and permissions
6. Processes your request

---

## Implementation Examples

### Using Axios (Recommended)

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

class ApiClient {
  private api: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include JWT
    this.api.interceptors.request.use((config) => {
      if (this.tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      }
      return config;
    });

    // Add response interceptor to handle token expiry
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleTokenExpiry(error)
    );

    this.loadTokensFromStorage();
  }

  /**
   * Handle 401 (Unauthorized) errors by refreshing the token
   */
  private async handleTokenExpiry(error: AxiosError): Promise<any> {
    const originalRequest = error.config;

    // Only refresh once per request
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        // Refresh the access token
        const newAccessToken = await this.refreshAccessToken();
        this.tokens!.accessToken = newAccessToken;
        this.saveTokensToStorage(this.tokens!);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return this.api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        this.logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.api.post('/auth/refresh', {
      refreshToken: this.tokens.refreshToken,
    });

    return response.data.accessToken;
  }

  /**
   * Store tokens after login/registration
   */
  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    this.saveTokensToStorage(tokens);
  }

  /**
   * Make authenticated GET request
   */
  get(url: string, config?: any) {
    return this.api.get(url, config);
  }

  /**
   * Make authenticated POST request
   */
  post(url: string, data?: any, config?: any) {
    return this.api.post(url, data, config);
  }

  /**
   * Make authenticated PATCH request
   */
  patch(url: string, data?: any, config?: any) {
    return this.api.patch(url, data, config);
  }

  /**
   * Make authenticated DELETE request
   */
  delete(url: string, config?: any) {
    return this.api.delete(url, config);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  /**
   * Logout and clear tokens
   */
  logout() {
    this.tokens = null;
    localStorage.removeItem('authTokens');
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(tokens: AuthTokens) {
    localStorage.setItem('authTokens', JSON.stringify(tokens));
  }

  /**
   * Load tokens from localStorage on init
   */
  private loadTokensFromStorage() {
    const stored = localStorage.getItem('authTokens');
    if (stored) {
      try {
        this.tokens = JSON.parse(stored);
      } catch (error) {
        this.tokens = null;
      }
    }
  }
}

export default ApiClient;
```

### Using Fetch API

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

class ApiClient {
  private baseURL: string;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadTokensFromStorage();
  }

  /**
   * Make authenticated request
   */
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token
    if (this.tokens?.accessToken) {
      headers.Authorization = `Bearer ${this.tokens.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiry
    if (response.status === 401 && !options._retry) {
      try {
        // Refresh token
        const newAccessToken = await this.refreshAccessToken();
        this.tokens!.accessToken = newAccessToken;
        this.saveTokensToStorage(this.tokens!);

        // Retry request with new token
        headers.Authorization = `Bearer ${newAccessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          _retry: true,
        });
      } catch (error) {
        this.logout();
        throw error;
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.accessToken;
  }

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    this.saveTokensToStorage(tokens);
  }

  logout() {
    this.tokens = null;
    localStorage.removeItem('authTokens');
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  private saveTokensToStorage(tokens: AuthTokens) {
    localStorage.setItem('authTokens', JSON.stringify(tokens));
  }

  private loadTokensFromStorage() {
    const stored = localStorage.getItem('authTokens');
    if (stored) {
      this.tokens = JSON.parse(stored);
    }
  }
}

export default ApiClient;
```

### Using React Hooks

```typescript
import { useState, useCallback } from 'react';
import ApiClient from './ApiClient';

const apiClient = new ApiClient('http://localhost:3000');

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.get(endpoint);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (endpoint: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.post(endpoint, data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const patch = useCallback(async (endpoint: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.patch(endpoint, data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.delete(endpoint);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { get, post, patch, remove, loading, error };
};

export default useApi;
```

### Usage Example

```typescript
// Login
const loginResponse = await apiClient.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123',
});

// Store tokens
apiClient.setTokens({
  accessToken: loginResponse.accessToken,
  refreshToken: loginResponse.refreshToken,
  sessionId: loginResponse.sessionId,
});

// Make authenticated request
const profile = await apiClient.get('/auth/profile');
// Automatically includes: Authorization: Bearer <accessToken>

// Update user profile
const updated = await apiClient.patch('/users/profile', {
  firstName: 'Jane',
});

// Delete account
await apiClient.delete('/users/account');
```

---

## How Token Refresh Works

### Automatic Flow

```
1. Frontend makes request with JWT token
                ↓
2. Token is valid → Request succeeds
                ↓
(1 hour passes, token expires)
                ↓
3. Frontend makes new request with expired token
                ↓
4. Backend returns 401 (Unauthorized)
                ↓
5. Frontend interceptor detects 401
                ↓
6. Frontend sends refresh token to /auth/refresh
                ↓
7. Backend validates refresh token, returns new JWT
                ↓
8. Frontend stores new JWT
                ↓
9. Frontend automatically retries original request
                ↓
10. Request succeeds with new JWT
```

**Key Point:** With the interceptor approach, token refresh happens automatically and transparently. Your code doesn't need to handle it manually.

### Manual Token Check

If you want to check token expiry before making a request:

```typescript
import jwtDecode from 'jwt-decode';

function isTokenExpired(token: string): boolean {
  try {
    const decoded: any = jwtDecode(token);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp < nowInSeconds;
  } catch (error) {
    return true;
  }
}

// Usage
if (isTokenExpired(apiClient.getAccessToken())) {
  await apiClient.refreshAccessToken();
}
```

---

## Token Storage

### localStorage (Recommended for this app)
```typescript
// Persists across browser sessions
// User stays logged in after page refresh

localStorage.setItem('authTokens', JSON.stringify({
  accessToken: '...',
  refreshToken: '...',
  sessionId: '...'
}));

// Retrieved on page load
const tokens = JSON.parse(localStorage.getItem('authTokens'));
```

### sessionStorage (Logout on browser close)
```typescript
// Cleared when browser is closed
// More secure but user loses session on refresh

sessionStorage.setItem('authTokens', JSON.stringify({...}));
```

### Memory Only (Most secure)
```typescript
// Not persisted anywhere
// Lost on page refresh
// User must re-login

let authTokens = null;
```

**Recommendation:** Use `localStorage` for better UX, but ensure your app protects against XSS attacks.

---

## Error Handling

### 401 Unauthorized

```typescript
// Token is invalid or expired
try {
  const data = await apiClient.get('/protected-endpoint');
} catch (error) {
  if (error.response?.status === 401) {
    // Automatic refresh happens via interceptor
    // If refresh fails, user is logged out
  }
}
```

### 403 Forbidden

```typescript
// Token is valid, but user lacks permission
try {
  const data = await apiClient.post('/admin-endpoint', {});
} catch (error) {
  if (error.response?.status === 403) {
    console.error('Access denied: insufficient permissions');
  }
}
```

---

## Best Practices

### 1. Always Use the API Client
```typescript
// ✅ Good - Uses interceptors for automatic token refresh
const data = await apiClient.get('/users/profile');

// ❌ Bad - No token, no refresh handling
const data = await fetch('http://api.example.com/users/profile');
```

### 2. Store Both Tokens
```typescript
// ✅ Good
apiClient.setTokens({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
  sessionId: response.sessionId,
});

// ❌ Bad - Missing refresh token
localStorage.setItem('token', response.accessToken);
```

### 3. Handle Logout Properly
```typescript
// ✅ Good - Clear tokens and redirect
function logout() {
  apiClient.logout(); // Clears localStorage
  redirectToLoginPage();
}

// ❌ Bad - Only redirect without clearing tokens
function logout() {
  redirectToLoginPage(); // Tokens still in localStorage
}
```

### 4. Protect Against XSS
```typescript
// ❌ Don't store sensitive data in localStorage
localStorage.setItem('password', 'mypassword');

// ✅ Only store tokens
localStorage.setItem('authTokens', JSON.stringify({...}));

// ✅ Use Content Security Policy
// <meta http-equiv="Content-Security-Policy" content="...">
```

### 5. Set Proper HTTP Headers
```typescript
// ✅ Correct
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// ❌ Incorrect - Missing "Bearer"
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Handle Offline Scenarios
```typescript
function isOnline(): boolean {
  return navigator.onLine;
}

async function makeRequest(endpoint: string) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  return apiClient.get(endpoint);
}
```

### 7. Implement Idle Logout
```typescript
// Auto-logout if user is inactive for 30 minutes
class IdleLogout {
  private timeout: NodeJS.Timeout;
  private IDLE_TIME = 30 * 60 * 1000; // 30 minutes

  start() {
    this.resetTimeout();
    document.addEventListener('mousemove', () => this.resetTimeout());
    document.addEventListener('keypress', () => this.resetTimeout());
  }

  private resetTimeout() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      apiClient.logout();
      alert('Session expired due to inactivity');
      window.location.href = '/login';
    }, this.IDLE_TIME);
  }
}
```

---

## Quick Reference

| Task | Code |
|------|------|
| **Initialize client** | `const api = new ApiClient('http://api.example.com')` |
| **Login & save tokens** | `api.setTokens(loginResponse)` |
| **Make GET request** | `const data = await api.get('/endpoint')` |
| **Make POST request** | `const data = await api.post('/endpoint', body)` |
| **Check if logged in** | `if (api.isAuthenticated()) { ... }` |
| **Logout** | `api.logout()` |
| **Refresh token manually** | `await api.refreshAccessToken()` |

---

## Summary

**JWT Authorization in 3 steps:**

1. **Get JWT** - Login and receive access token + refresh token
2. **Use JWT** - Add `Authorization: Bearer <token>` to every request
3. **Refresh JWT** - When expired, use refresh token to get new JWT (automatic with interceptors)

The backend validates the JWT signature and checks token expiry automatically. Your frontend just needs to include the token in the `Authorization` header.

