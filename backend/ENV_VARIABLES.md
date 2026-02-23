# Environment Variables Configuration

This document lists all required and optional environment variables for ClientHub backend.

---

## Required Variables

### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=faithharborclien_clienthub
DB_USER=faithharborclien_usercliENt
DB_PASSWORD=your_secure_password_here
```

### JWT Configuration
```env
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_min_32_characters
JWT_REFRESH_EXPIRES_IN=30d
```

### Email Configuration (for password reset, notifications)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@clienthub.com
```

### Stripe Configuration (Phase 10 - Subscriptions)
```env
# Stripe API Keys
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_live_51SxRSDH7DLU0lDSa8dx5PyKrxYV0d1KYBw7y39gbd8A7vlpjvIIi7cFbBbGQoLui6Tv0G4oG7uzdO1fG2abBLKDc00n5rVMlJq

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Optional: Stripe API Version
STRIPE_API_VERSION=2023-10-16
```

---

## Optional Variables

### Server Configuration
```env
# Server Port (default: 5000)
PORT=5000

# Node Environment (development, production, test)
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### Rate Limiting
```env
# Rate limit window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100
```

### File Upload Configuration
```env
# Maximum file size in bytes (default: 10MB)
MAX_FILE_SIZE=10485760

# Upload directory (default: ./uploads)
UPLOAD_DIR=./uploads
```

---

## Example .env File

Create a `.env` file in the root directory with these variables:

```env
# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=faithharborclien_clienthub
DB_USER=faithharborclien_usercliENt
DB_PASSWORD=your_secure_password_here

# ==============================================
# JWT CONFIGURATION
# ==============================================
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters_long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_min_32_characters_long
JWT_REFRESH_EXPIRES_IN=30d

# ==============================================
# EMAIL CONFIGURATION
# ==============================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=ClientHub <noreply@clienthub.com>

# ==============================================
# STRIPE CONFIGURATION (Phase 10)
# ==============================================
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Get this from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Specify Stripe API version
STRIPE_API_VERSION=2023-10-16

# ==============================================
# SERVER CONFIGURATION
# ==============================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ==============================================
# RATE LIMITING
# ==============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# FILE UPLOAD CONFIGURATION
# ==============================================
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## Security Best Practices

### 1. Never Commit .env Files
Add `.env` to your `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 2. Use Strong Secrets
- JWT secrets should be at least 32 characters
- Use a password generator for secrets
- Never use default or example values in production

### 3. Rotate Secrets Regularly
- Change JWT secrets periodically
- Rotate Stripe API keys if compromised
- Update database passwords regularly

### 4. Environment-Specific Configuration
Use different `.env` files for different environments:
- `.env.development` - Local development
- `.env.staging` - Staging server
- `.env.production` - Production server

### 5. Stripe Keys
- **Development:** Use test keys (sk_test_, pk_test_)
- **Production:** Use live keys (sk_live_, pk_live_)
- Never mix test and live keys

---

## Generating Secure Secrets

### Using Node.js
```javascript
// Generate a random 32-character secret
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

### Using OpenSSL
```bash
openssl rand -hex 32
```

### Using PowerShell
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## Stripe Configuration Steps

### 1. Get Stripe Keys
1. Sign up at https://stripe.com
2. Go to Developers > API keys
3. Copy your test keys for development
4. Copy your live keys for production

### 2. Set Up Webhook
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events (see STRIPE_SETUP_GUIDE.md)
4. Copy the webhook signing secret

### 3. Update Database
Run SQL to update subscription plans with Stripe price IDs (see STRIPE_SETUP_GUIDE.md)

---

## Troubleshooting

### Database Connection Issues
- Verify DB_HOST, DB_PORT, DB_NAME are correct
- Check PostgreSQL is running
- Verify user has correct permissions
- Test connection: `psql -h localhost -U your_user -d your_database`

### JWT Issues
- Ensure JWT_SECRET is at least 32 characters
- Check JWT_EXPIRES_IN format (e.g., '7d', '24h', '60m')
- Verify JWT_REFRESH_SECRET is different from JWT_SECRET

### Email Issues
- For Gmail, use App-Specific Password
- Enable "Less secure app access" if needed
- Check EMAIL_HOST and EMAIL_PORT are correct
- Verify EMAIL_USER and EMAIL_PASSWORD

### Stripe Issues
- Verify STRIPE_SECRET_KEY starts with sk_test_ or sk_live_
- Check STRIPE_WEBHOOK_SECRET starts with whsec_
- Ensure you're using matching test/live keys
- Test webhook: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] Using strong, unique secrets
- [ ] Stripe live keys configured
- [ ] Webhook endpoint updated to production URL
- [ ] Database credentials secured
- [ ] Email configuration tested
- [ ] FRONTEND_URL points to production domain
- [ ] NODE_ENV set to 'production'
- [ ] Rate limiting configured appropriately
- [ ] File upload limits set correctly
- [ ] All secrets rotated from development
- [ ] .env file not committed to version control
- [ ] Environment variables set in hosting platform

---

## Additional Resources

- **Stripe Setup:** See `STRIPE_SETUP_GUIDE.md`
- **API Documentation:** See `API_TESTING.md`
- **Phase 10 Summary:** See `PHASE10_SUMMARY.md`

---

**Last Updated:** February 2026  
**Version:** 1.0.0
