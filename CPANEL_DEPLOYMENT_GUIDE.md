# ClientHub - cPanel Deployment Guide

## 📋 Prerequisites

✅ **Database Created:**
- Database: `faithharborclien_clienthub`
- User: `faithharborclien_usercliENt`
- Password: `11809Mills!`

## 🚀 Step-by-Step Deployment

### Step 1: Apply Database Schema

1. **Access PostgreSQL via cPanel:**
   - Go to cPanel → **phpPgAdmin** (or use SSH)

2. **Connect to your database:**
   - Select database: `faithharborclien_clienthub`

3. **Run the schema:**
   - Open file: `database/cpanel-schema.sql`
   - Copy the entire contents
   - Paste into SQL query window
   - Click **Execute**

4. **Verify tables created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   You should see 18 tables:
   - users
   - profiles
   - brands
   - brand_members
   - payment_plans
   - subscriptions
   - clients
   - projects
   - project_updates
   - documents
   - messages
   - invoices
   - invoice_items
   - client_portal_settings
   - support_tickets
   - ticket_replies
   - email_templates
   - site_settings

### Step 2: Test Database Connection

**Via SSH (if available):**
```bash
psql -h localhost -U faithharborclien_usercliENt -d faithharborclien_clienthub
```

**Test query:**
```sql
SELECT * FROM users WHERE email = 'admin@clienthub.com';
```

You should see the default admin user.

---

## 🔧 Next Steps: Backend API Setup

Since your current SAAS Starter Kit uses Supabase, we need to build a Node.js backend API to replace it.

### Option A: Quick Start (Recommended)

I can create a complete Node.js + Express backend with:
- ✅ JWT authentication
- ✅ All CRUD endpoints for clients, projects, documents, etc.
- ✅ File upload handling
- ✅ Stripe integration
- ✅ Email sending
- ✅ Authorization middleware

**Estimated time:** 1-2 weeks to build and test

### Option B: Gradual Migration

1. Keep using Supabase for now
2. Build backend API incrementally
3. Migrate features one by one
4. Switch over when ready

**Estimated time:** 2-3 weeks

---

## 📁 Project Structure (After Backend Setup)

```
clienthub/
├── frontend/                    # React app (existing)
│   ├── src/
│   ├── public/
│   ├── .env
│   └── package.json
│
├── backend/                     # NEW - Node.js API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, etc.
│   │   │   ├── clients.js      # Client CRUD
│   │   │   ├── projects.js     # Project CRUD
│   │   │   ├── documents.js    # File upload/download
│   │   │   ├── messages.js     # Messaging
│   │   │   └── invoices.js     # Invoice management
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── authorize.js    # Permission checks
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   ├── uploads/                # File storage
│   ├── .env
│   └── package.json
│
└── database/
    ├── cpanel-schema.sql       # ✅ Created
    └── migrations/
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Update JWT_SECRET in .env
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Review file upload restrictions
- [ ] Enable email verification
- [ ] Set up monitoring/logging

---

## 🌐 Domain Setup

### For API (Backend):
1. Create subdomain in cPanel: `api.yourdomain.com`
2. Point to Node.js app directory
3. Enable SSL certificate

### For Frontend:
1. Use main domain: `yourdomain.com`
2. Upload built React app to `public_html`
3. Configure `.htaccess` for React Router

---

## 📊 Current Status

### ✅ Completed:
1. Database created in cPanel
2. Schema file created (`cpanel-schema.sql`)
3. Environment variables template (`.env.example`)
4. Migration plan documented

### 🔄 In Progress:
- Applying database schema

### ⏳ Pending:
1. Build Node.js backend API
2. Update frontend to use new API
3. Deploy backend to cPanel
4. Deploy frontend to cPanel
5. Configure domains
6. Test everything
7. Go live!

---

## 🆘 Troubleshooting

### Issue: Can't connect to PostgreSQL
**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U faithharborclien_usercliENt -d faithharborclien_clienthub
```

### Issue: Permission denied
**Solution:**
```sql
-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE faithharborclien_clienthub TO faithharborclien_usercliENt;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO faithharborclien_usercliENt;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO faithharborclien_usercliENt;
```

### Issue: Schema errors
**Solution:**
- Make sure you're using PostgreSQL (not MySQL)
- Run schema in correct order
- Check PostgreSQL version (should be 12+)

---

## 📞 Next Actions

**Ready to proceed? Choose one:**

### 1. Apply Schema Now ✅
- Follow Step 1 above
- Run the SQL in phpPgAdmin
- Verify tables created
- Report back any errors

### 2. Build Backend API 🔧
- I'll create complete Node.js backend
- With all endpoints and authentication
- Ready to deploy on cPanel

### 3. Discuss Architecture 💬
- Review the migration plan
- Adjust based on your needs
- Plan timeline

**Which would you like to do next?**
