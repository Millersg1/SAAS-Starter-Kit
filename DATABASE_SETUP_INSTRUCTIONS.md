# Database Setup Instructions - TROUBLESHOOTING

## ❌ Error You're Seeing

```
ERROR: syntax error at or near "CREATE"
LINE 15: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## ✅ Solution: Run Extensions Separately

The extensions might need superuser privileges. Here's how to fix it:

### Method 1: Enable Extensions First (Recommended)

**Step 1: Contact your hosting provider or run as superuser:**

```sql
-- Run these FIRST as superuser or ask hosting to enable
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**Step 2: Then run the main schema**

After extensions are enabled, run the rest of the schema starting from line 35 (the USERS TABLE section).

---

### Method 2: Skip Extension Errors

If you can't enable extensions as superuser, they might already be installed. Try this:

**Step 1: Check if extensions exist:**

```sql
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
```

If they're listed, they're already installed! You can proceed.

**Step 2: Run schema without extension lines:**

Open `cpanel-schema.sql` and **skip lines 15-33** (the DO $$ blocks for extensions).

Start executing from line 35:
```sql
-- ===========================================
-- USERS TABLE
-- ===========================================
```

---

### Method 3: Use Alternative UUID Generation

If uuid-ossp won't install, use this modified schema:

**Replace this line:**
```sql
uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
```

**With this:**
```sql
uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
```

`gen_random_uuid()` is built into PostgreSQL 13+ and doesn't need the extension.

---

## 📋 Step-by-Step Application

### Option A: Via phpPgAdmin (GUI)

1. **Login to cPanel → phpPgAdmin**
2. **Select database:** `faithharborclien_clienthub`
3. **Click SQL tab**
4. **Copy schema starting from line 35** (skip extensions)
5. **Paste and Execute**
6. **Verify:** Check if tables were created

### Option B: Via SSH (Command Line)

```bash
# Connect to PostgreSQL
psql -h localhost -U faithharborclien_usercliENt -d faithharborclien_clienthub

# At the psql prompt, run:
\i /path/to/cpanel-schema.sql

# Or copy-paste the SQL directly
```

### Option C: Via psql with File

```bash
# From command line
psql -h localhost -U faithharborclien_usercliENt -d faithharborclien_clienthub -f cpanel-schema.sql
```

---

## 🧪 Verify Installation

After running the schema, verify it worked:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**You should see 18 tables:**
1. brands
2. brand_members
3. clients
4. client_portal_settings
5. documents
6. email_templates
7. invoices
8. invoice_items
9. messages
10. payment_plans
11. profiles
12. projects
13. project_updates
14. site_settings
15. subscriptions
16. support_tickets
17. ticket_replies
18. users

```sql
-- Check if admin user was created
SELECT email, full_name, role FROM users;
```

**You should see:**
- Email: admin@clienthub.com
- Full Name: Admin User
- Role: admin

```sql
-- Check payment plans
SELECT slug, name, price FROM payment_plans ORDER BY sort_order;
```

**You should see 3 plans:**
- free ($0.00)
- starter ($29.00)
- pro ($79.00)

---

## 🔧 Common Issues & Fixes

### Issue 1: "permission denied for schema public"

**Fix:**
```sql
GRANT ALL ON SCHEMA public TO faithharborclien_usercliENt;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO faithharborclien_usercliENt;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO faithharborclien_usercliENt;
```

### Issue 2: "extension uuid-ossp does not exist"

**Fix:** Use `gen_random_uuid()` instead (see Method 3 above)

### Issue 3: "function crypt does not exist"

**Fix:** The pgcrypto extension isn't installed. Either:
- Ask hosting to install it
- Or temporarily change the admin password insert to use a plain hash

### Issue 4: "syntax error" on various lines

**Fix:** Make sure you're using PostgreSQL, not MySQL. Check:
```sql
SELECT version();
```

Should show "PostgreSQL" not "MySQL"

---

## 📞 Need Help?

If you're still getting errors:

1. **Copy the exact error message**
2. **Note which line number**
3. **Check PostgreSQL version:**
   ```sql
   SELECT version();
   ```
4. **Check if you have superuser access:**
   ```sql
   SELECT current_user, session_user;
   ```

---

## ✅ Success Checklist

After successful installation:

- [ ] 18 tables created
- [ ] Admin user exists (admin@clienthub.com)
- [ ] 3 payment plans exist
- [ ] Can query: `SELECT * FROM users;`
- [ ] Can query: `SELECT * FROM payment_plans;`
- [ ] No errors in PostgreSQL logs

---

## 🚀 Next Steps After Database Setup

Once the database is set up successfully:

1. **Test the connection** from your application
2. **Change the admin password** (don't use default!)
3. **Start building the backend API**
4. **Deploy to cPanel**

Ready to proceed with backend development!
