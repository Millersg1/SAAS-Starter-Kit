# ClientHub - Domain Setup Guide
## Domain: faithharborclienthub.com

## 🌐 Domain Structure

Your ClientHub will use the following domain structure:

### Main Application
- **URL:** `https://faithharborclienthub.com`
- **Purpose:** Main ClientHub application (agency dashboard)
- **Points to:** Frontend React app

### API Backend
- **URL:** `https://api.faithharborclienthub.com`
- **Purpose:** Backend API for all operations
- **Points to:** Node.js Express server

### Client Portal (Optional)
- **URL:** `https://portal.faithharborclienthub.com`
- **Purpose:** Client-facing portal (white-label)
- **Points to:** Frontend React app (client view)

---

## 📋 cPanel Setup Steps

### Step 1: Create Subdomains

1. **Go to cPanel → Domains → Subdomains**

2. **Create API subdomain:**
   - Subdomain: `api`
   - Domain: `faithharborclienthub.com`
   - Document Root: `/home/username/api` (or your preferred path)
   - Click **Create**

3. **Create Portal subdomain (optional):**
   - Subdomain: `portal`
   - Domain: `faithharborclienthub.com`
   - Document Root: `/home/username/portal`
   - Click **Create**

### Step 2: SSL Certificates

1. **Go to cPanel → Security → SSL/TLS Status**

2. **Enable AutoSSL for all domains:**
   - ✅ faithharborclienthub.com
   - ✅ api.faithharborclienthub.com
   - ✅ portal.faithharborclienthub.com

3. **Or install Let's Encrypt manually:**
   ```bash
   # Via SSH
   certbot --apache -d faithharborclienthub.com -d api.faithharborclienthub.com
   ```

### Step 3: DNS Configuration

**If DNS is managed in cPanel:**

1. **Go to cPanel → Domains → Zone Editor**

2. **Verify A Records exist:**
   ```
   faithharborclienthub.com        → Your Server IP
   api.faithharborclienthub.com    → Your Server IP
   portal.faithharborclienthub.com → Your Server IP
   ```

3. **Add CNAME if needed:**
   ```
   www.faithharborclienthub.com → faithharborclienthub.com
   ```

**If DNS is external (e.g., Cloudflare, Namecheap):**

Add these records in your DNS provider:
```
Type    Name        Value               TTL
A       @           [Your Server IP]    Auto
A       api         [Your Server IP]    Auto
A       portal      [Your Server IP]    Auto
CNAME   www         faithharborclienthub.com    Auto
```

---

## 🚀 Deployment Structure

### Main Domain (faithharborclienthub.com)

**Directory:** `/home/username/public_html/`

**Contents:**
```
public_html/
├── index.html
├── assets/
├── static/
└── .htaccess
```

**`.htaccess` for React Router:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### API Subdomain (api.faithharborclienthub.com)

**Directory:** `/home/username/api/`

**Setup Node.js App in cPanel:**
1. Go to **Setup Node.js App**
2. Create application:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `/home/username/api`
   - Application URL: `api.faithharborclienthub.com`
   - Application startup file: `src/index.js`

**Directory Structure:**
```
api/
├── src/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── models/
│   └── index.js
├── uploads/
├── node_modules/
├── .env
├── package.json
└── package-lock.json
```

---

## 🔒 Security Configuration

### 1. Force HTTPS

Add to `.htaccess` in main domain:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 2. CORS Configuration

In your Node.js backend (`src/index.js`):
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://faithharborclienthub.com',
    'https://www.faithharborclienthub.com',
    'https://portal.faithharborclienthub.com'
  ],
  credentials: true
}));
```

### 3. Environment Variables

**Never commit `.env` files!**

Create `.env` from `.env.production`:
```bash
cp .env.production .env
# Edit .env with actual values
```

---

## 📧 Email Configuration

### Setup Email Accounts in cPanel

1. **Go to cPanel → Email → Email Accounts**

2. **Create accounts:**
   - `noreply@faithharborclienthub.com` - For automated emails
   - `admin@faithharborclienthub.com` - For admin notifications
   - `support@faithharborclienthub.com` - For customer support

3. **Get SMTP settings:**
   - SMTP Host: `mail.faithharborclienthub.com`
   - SMTP Port: 587 (TLS) or 465 (SSL)
   - Username: Full email address
   - Password: Email account password

4. **Update `.env`:**
   ```
   SMTP_HOST=mail.faithharborclienthub.com
   SMTP_PORT=587
   SMTP_USER=noreply@faithharborclienthub.com
   SMTP_PASSWORD=your-password
   ```

---

## 🧪 Testing Checklist

After deployment, test:

### Main Domain
- [ ] `https://faithharborclienthub.com` loads
- [ ] SSL certificate is valid
- [ ] React Router works (refresh on any page)
- [ ] All assets load correctly

### API Subdomain
- [ ] `https://api.faithharborclienthub.com` responds
- [ ] SSL certificate is valid
- [ ] Health check endpoint works
- [ ] CORS allows main domain

### Email
- [ ] Can send emails from noreply@
- [ ] Emails not going to spam
- [ ] Email templates render correctly

### Database
- [ ] API can connect to PostgreSQL
- [ ] Queries execute successfully
- [ ] Connection pooling works

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to API"
**Check:**
1. Node.js app is running in cPanel
2. Firewall allows port 3001
3. CORS is configured correctly
4. SSL certificate is valid

### Issue: "Database connection failed"
**Check:**
1. PostgreSQL is running
2. Database credentials are correct
3. User has proper permissions
4. Connection string format is correct

### Issue: "Emails not sending"
**Check:**
1. SMTP credentials are correct
2. Port 587 or 465 is open
3. Email account exists in cPanel
4. Check spam folder

### Issue: "404 on page refresh"
**Check:**
1. `.htaccess` file exists
2. `mod_rewrite` is enabled
3. React Router is configured
4. Build includes all routes

---

## 📊 Monitoring

### Setup Monitoring

1. **Uptime Monitoring:**
   - Use UptimeRobot or similar
   - Monitor: faithharborclienthub.com
   - Monitor: api.faithharborclienthub.com

2. **Error Logging:**
   - Check cPanel error logs
   - Check Node.js app logs
   - Set up log rotation

3. **Performance:**
   - Use Google PageSpeed Insights
   - Monitor API response times
   - Check database query performance

---

## 🎯 Go-Live Checklist

Before launching:

- [ ] Database schema applied
- [ ] Backend API deployed and running
- [ ] Frontend built and deployed
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Email accounts created
- [ ] SMTP configured and tested
- [ ] Environment variables set
- [ ] Security headers configured
- [ ] CORS configured
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Admin account created
- [ ] Test all features
- [ ] Load testing completed

---

## 📞 Support

**Domain:** faithharborclienthub.com
**Database:** faithharborclien_clienthub
**Email:** admin@faithharborclienthub.com

Ready to proceed with deployment!
