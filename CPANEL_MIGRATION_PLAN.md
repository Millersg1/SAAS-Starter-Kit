# ClientHub - cPanel/PostgreSQL Migration Plan

## 🎯 Overview

Yes, it's absolutely possible to build ClientHub on your cPanel server with PostgreSQL! However, this requires replacing Supabase-specific features with self-hosted alternatives.

## 🔄 What Needs to Change

### Current Architecture (Supabase)
- **Database:** Supabase PostgreSQL (managed)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **API:** Supabase Edge Functions
- **Security:** Row Level Security (RLS)

### New Architecture (cPanel + PostgreSQL)
- **Database:** Self-hosted PostgreSQL
- **Authentication:** Custom JWT auth or Passport.js
- **Storage:** Local filesystem or S3-compatible storage
- **Realtime:** Socket.io or WebSockets
- **API:** Node.js/Express backend
- **Security:** Application-level authorization middleware

---

## 📋 Migration Steps

### Step 1: Database Setup ✅ (Mostly Done)

**What's Already Compatible:**
- ✅ All table structures (clients, projects, documents, etc.)
- ✅ Indexes and constraints
- ✅ Triggers for updated_at
- ✅ Helper functions (with modifications)

**What Needs Modification:**
- ❌ Remove Supabase-specific RLS policies
- ❌ Remove `auth.users` references
- ❌ Remove `storage.buckets` and `storage.objects` references
- ❌ Modify authentication-related functions

**Action:** Create `cpanel-schema.sql` with modified schema

---

### Step 2: Backend API Setup (NEW)

**Technology Stack Options:**

#### Option A: Node.js + Express (Recommended)
```
Backend Stack:
- Node.js + Express
- PostgreSQL (pg library)
- JWT for authentication
- Multer for file uploads
- Bcrypt for password hashing
- Stripe SDK for payments
```

#### Option B: PHP + Laravel (cPanel Native)
```
Backend Stack:
- PHP 8.x + Laravel
- PostgreSQL (PDO)
- Laravel Sanctum for auth
- Laravel Storage for files
- Stripe PHP SDK
```

**Recommendation:** Node.js + Express (better integration with React frontend)

**What to Build:**
- Authentication endpoints (register, login, logout, refresh token)
- CRUD endpoints for all resources (clients, projects, documents, etc.)
- File upload/download endpoints
- Stripe webhook handler
- Email sending service
- Authorization middleware

---

### Step 3: Authentication System

**Replace Supabase Auth with Custom Auth:**

**Database Changes:**
```sql
-- Create users table (replaces auth.users)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update profiles table to reference users
ALTER TABLE profiles 
    DROP CONSTRAINT profiles_id_fkey,
    ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (id) REFERENCES users(uuid) ON DELETE CASCADE;
```

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

**JWT Implementation:**
```javascript
// Generate JWT token
const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);

// Verify JWT middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

---

### Step 4: File Storage System

**Replace Supabase Storage with Local Storage:**

**Options:**

#### Option A: Local Filesystem (Simple)
```javascript
// Using Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = `./uploads/${req.user.brandId}`;
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});
```

#### Option B: S3-Compatible Storage (Scalable)
```javascript
// Using AWS SDK or MinIO
const s3 = new AWS.S3({
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
});
```

**API Endpoints:**
- `POST /api/documents/upload` - Upload file
- `GET /api/documents/:id/download` - Download file
- `DELETE /api/documents/:id` - Delete file
- `GET /api/documents/:id/preview` - Preview file (if supported)

**Database Changes:**
```sql
-- Update documents table
ALTER TABLE documents
    DROP COLUMN file_path, -- Remove Supabase storage path
    ADD COLUMN file_path TEXT NOT NULL, -- Local path or S3 key
    ADD COLUMN storage_type TEXT DEFAULT 'local' CHECK (storage_type IN ('local', 's3'));
```

---

### Step 5: Frontend Changes

**Replace Supabase Client with API Client:**

**Before (Supabase):**
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('brand_id', brandId);
```

**After (Custom API):**
```typescript
import { apiClient } from '@/lib/api-client';

const { data, error } = await apiClient.get('/api/clients', {
    params: { brand_id: brandId }
});
```

**Create API Client:**
```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Redirect to login or refresh token
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export { apiClient };
```

---

### Step 6: Realtime Features (Optional)

**Replace Supabase Realtime with Socket.io:**

**Backend:**
```javascript
const io = require('socket.io')(server, {
    cors: { origin: process.env.FRONTEND_URL }
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // Verify JWT token
    next();
});

io.on('connection', (socket) => {
    socket.on('join_brand', (brandId) => {
        socket.join(`brand_${brandId}`);
    });
    
    // Emit new message to brand room
    socket.to(`brand_${brandId}`).emit('new_message', message);
});
```

**Frontend:**
```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
    auth: { token: localStorage.getItem('auth_token') }
});

socket.on('new_message', (message) => {
    // Update UI with new message
});
```

---

### Step 7: Deployment on cPanel

**Backend Deployment:**

1. **Setup Node.js App in cPanel:**
   - Go to cPanel → Setup Node.js App
   - Create new application
   - Set Node.js version (18.x or higher)
   - Set application root
   - Set application URL (e.g., api.yourdomain.com)

2. **Environment Variables:**
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/clienthub
   JWT_SECRET=your-secret-key-here
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=https://yourdomain.com
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=your-email-password
   ```

3. **Install Dependencies:**
   ```bash
   cd /home/username/api
   npm install
   ```

4. **Start Application:**
   ```bash
   npm run build
   npm start
   ```

**Frontend Deployment:**

1. **Build React App:**
   ```bash
   npm run build
   ```

2. **Upload to cPanel:**
   - Upload `dist` folder contents to `public_html`
   - Or use Git deployment

3. **Configure .htaccess for React Router:**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

**Database Setup:**

1. **Create PostgreSQL Database in cPanel:**
   - Go to PostgreSQL Databases
   - Create database: `clienthub`
   - Create user and grant privileges

2. **Run Schema:**
   ```bash
   psql -U username -d clienthub -f cpanel-schema.sql
   ```

---

## 📁 New Project Structure

```
clienthub/
├── frontend/                 # React app (existing)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/                  # NEW - Node.js API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── clients.js
│   │   │   ├── projects.js
│   │   │   ├── documents.js
│   │   │   ├── messages.js
│   │   │   └── invoices.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── authorization.js
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.js
│   ├── uploads/             # File storage
│   ├── .env
│   └── package.json
│
└── database/
    ├── schema.sql           # Original Supabase schema
    ├── cpanel-schema.sql    # NEW - Modified for cPanel
    └── migrations/
```

---

## ⚖️ Pros & Cons

### Supabase (Original)
**Pros:**
- ✅ Managed infrastructure
- ✅ Built-in auth, storage, realtime
- ✅ Automatic API generation
- ✅ Free tier available
- ✅ Faster development

**Cons:**
- ❌ Vendor lock-in
- ❌ Monthly costs at scale
- ❌ Less control over infrastructure
- ❌ Requires internet connection

### cPanel + PostgreSQL (Self-Hosted)
**Pros:**
- ✅ Full control over infrastructure
- ✅ No vendor lock-in
- ✅ One-time hosting cost
- ✅ Can work offline (local dev)
- ✅ Custom optimizations

**Cons:**
- ❌ More setup required
- ❌ Need to build auth system
- ❌ Need to manage backups
- ❌ Need to handle scaling
- ❌ Slower initial development

---

## 🚀 Recommended Approach

### Option 1: Hybrid (Best of Both Worlds)
- **Development:** Use Supabase for rapid prototyping
- **Production:** Migrate to cPanel once stable
- **Benefit:** Fast development + full control

### Option 2: Full Self-Hosted (Your Request)
- Build everything on cPanel from the start
- More work upfront but complete control
- Estimated time: +2-3 weeks for backend setup

### Option 3: Supabase First (Fastest)
- Launch with Supabase
- Migrate later if needed
- Get to market faster

---

## 📝 Next Steps

**If you want to proceed with cPanel deployment:**

1. **I'll create:**
   - Modified database schema (cpanel-schema.sql)
   - Backend API structure (Node.js + Express)
   - Updated frontend API client
   - Deployment guide for cPanel

2. **You'll need to:**
   - Confirm Node.js version available on cPanel
   - Provide PostgreSQL connection details
   - Set up domain/subdomain for API
   - Configure email SMTP settings

**Estimated Timeline:**
- Backend API setup: 1-2 weeks
- Frontend migration: 3-5 days
- Testing & deployment: 3-5 days
- **Total: 2-3 weeks**

Would you like me to proceed with creating the cPanel-compatible version?
