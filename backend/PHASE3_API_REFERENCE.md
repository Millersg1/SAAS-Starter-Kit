# Phase 3: User Management API Reference

Quick reference guide for all Phase 3 user management endpoints.

---

## Base URL
```
http://localhost:5000/api/users
```

## Authentication
All endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get Current User Profile

```http
GET /api/users/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "client|agency|admin",
      "phone": "string|null",
      "avatar_url": "string|null",
      "bio": "string|null",
      "preferences": {
        "theme": "light|dark|auto",
        "language": "en|es|fr|de|pt",
        "notifications": {
          "email": boolean,
          "push": boolean,
          "sms": boolean
        },
        "timezone": "string",
        "dateFormat": "MM/DD/YYYY|DD/MM/YYYY|YYYY-MM-DD",
        "currency": "string"
      },
      "email_verified": boolean,
      "is_active": boolean,
      "last_login": "timestamp",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  }
}
```

---

### 2. Update User Profile

```http
PATCH /api/users/me
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (all fields optional)
```json
{
  "name": "string (2-100 chars)",
  "phone": "string (E.164 format: +1234567890)",
  "bio": "string (max 500 chars)",
  "avatar_url": "string (valid URL)"
}
```

**Response: 200 OK**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user": { /* updated user object */ }
  }
}
```

**Validation Errors: 400 Bad Request**
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    {
      "field": "phone",
      "message": "Please provide a valid phone number in E.164 format"
    }
  ]
}
```

---

### 3. Update User Preferences

```http
PATCH /api/users/me/preferences
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (all fields optional, merges with existing)
```json
{
  "theme": "light|dark|auto",
  "language": "en|es|fr|de|pt",
  "notifications": {
    "email": boolean,
    "push": boolean,
    "sms": boolean
  },
  "timezone": "string",
  "dateFormat": "MM/DD/YYYY|DD/MM/YYYY|YYYY-MM-DD",
  "currency": "string (3-letter ISO code)"
}
```

**Response: 200 OK**
```json
{
  "status": "success",
  "message": "Preferences updated successfully",
  "data": {
    "user": { /* user object with updated preferences */ }
  }
}
```

---

### 4. Delete User Account (Soft Delete)

```http
DELETE /api/users/me
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "status": "success",
  "message": "Account deleted successfully. We're sorry to see you go!"
}
```

**Note:** This is a soft delete. The account is deactivated but data is preserved.

---

## Error Responses

### 401 Unauthorized
```json
{
  "status": "fail",
  "message": "Not authenticated. Please log in."
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "User not found"
}
```

### 400 Bad Request (Validation)
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error description"
    }
  ]
}
```

---

## cURL Examples

### Get Profile
```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Profile
```bash
curl -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+12345678901",
    "bio": "Software Developer"
  }'
```

### Update Preferences
```bash
curl -X PATCH http://localhost:5000/api/users/me/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    }
  }'
```

### Delete Account
```bash
curl -X DELETE http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Validation Rules

### Profile Fields
- **name**: 2-100 characters
- **phone**: E.164 format (e.g., +12345678901)
- **bio**: Maximum 500 characters
- **avatar_url**: Valid URL format

### Preferences
- **theme**: Must be one of: light, dark, auto
- **language**: Must be one of: en, es, fr, de, pt
- **dateFormat**: Must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- **currency**: 3-letter uppercase ISO code (e.g., USD, EUR, GBP)
- **notifications**: Object with boolean values for email, push, sms

---

## Notes

1. **Partial Updates**: You can update individual fields without sending all fields
2. **Preferences Merge**: New preferences are merged with existing ones
3. **Soft Delete**: Deleted accounts preserve data but cannot be accessed
4. **Authentication**: All endpoints require valid JWT token
5. **Rate Limiting**: Subject to global API rate limits (100 req/15min)

---

## Testing

Test files are available in the project root:
- `test-get-profile.json`
- `test-update-profile.json`
- `test-update-preferences.json`
- `test-invalid-phone.json`

---

*Last Updated: February 16, 2026*
