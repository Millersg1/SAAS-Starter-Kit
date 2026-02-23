# ClientHub API Testing Guide

## Authentication Endpoints

### Base URL
```
http://localhost:5000/api/auth
```

---

## 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "client"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "email_verified": false,
      "created_at": "2026-02-16T21:34:13.802Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "client"
  }'
```

---

## 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "client",
      "email_verified": false,
      "last_login": "2026-02-16T21:34:51.405Z",
      "created_at": "2026-02-16T21:34:13.802Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

---

## 3. Get Current User (Protected)

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "email_verified": false,
      "last_login": "2026-02-16T21:34:51.405Z",
      "created_at": "2026-02-16T21:34:13.802Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 4. Logout (Protected)

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logout successful"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 5. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 6. Verify Email

**Endpoint:** `GET /api/auth/verify-email/:token`

**URL Parameters:**
- `token`: Email verification token from the verification email

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Email verified successfully! You can now access all features.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "email_verified": true,
      "created_at": "2026-02-16T21:34:13.802Z"
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/verify-email/YOUR_VERIFICATION_TOKEN
```

---

## 7. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset link has been sent to your email."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

---

## 8. Reset Password

**Endpoint:** `POST /api/auth/reset-password/:token`

**URL Parameters:**
- `token`: Password reset token from the reset email

**Request Body:**
```json
{
  "password": "NewSecurePass123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successful! You can now login with your new password.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "email_verified": true
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password/YOUR_RESET_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePass123"
  }'
```

---

## 9. Update Password (Protected)

**Endpoint:** `PATCH /api/auth/update-password`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePass123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password updated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:5000/api/auth/update-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewSecurePass123"
  }'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Invalid email or password"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## Validation Rules

### Registration
- **name**: Required, 2-50 characters
- **email**: Required, valid email format
- **password**: Required, minimum 8 characters, at least one uppercase, one lowercase, one number
- **role**: Optional, one of: 'admin', 'agency', 'client' (defaults to 'client')

### Login
- **email**: Required, valid email format
- **password**: Required

### Forgot Password
- **email**: Required, valid email format

### Reset Password
- **password**: Required, minimum 8 characters, at least one uppercase, one lowercase, one number

### Update Password
- **currentPassword**: Required
- **newPassword**: Required, minimum 8 characters, at least one uppercase, one lowercase, one number

---

## Token Information

### Access Token
- **Expiration**: 7 days
- **Usage**: Include in Authorization header as `Bearer <token>`
- **Purpose**: Authenticate API requests

### Refresh Token
- **Expiration**: 30 days
- **Usage**: Send to `/api/auth/refresh` endpoint
- **Purpose**: Get new access token without re-login

---

## Testing with Postman

1. Import the endpoints into Postman
2. Create an environment with:
   - `baseUrl`: http://localhost:5000
   - `accessToken`: (will be set after login)
   - `refreshToken`: (will be set after login)

3. After login, save the tokens to environment variables:
   ```javascript
   // In Postman Tests tab
   const response = pm.response.json();
   pm.environment.set("accessToken", response.data.accessToken);
   pm.environment.set("refreshToken", response.data.refreshToken);
   ```

4. Use `{{accessToken}}` in Authorization headers for protected routes

---

## Development Notes

- Email verification and password reset emails are logged to console in development mode
- Check server logs for verification tokens and reset tokens during testing
- All passwords are hashed using bcrypt before storage
- JWT tokens are signed with the secret from environment variables
- Rate limiting is applied to all `/api/*` routes (100 requests per 15 minutes per IP)
