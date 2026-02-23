# ClientHub Backend API

White-label client portal backend for agencies - Built with Node.js, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 10+
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your database credentials and configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=faithharborclien_clienthub
DB_USER=faithharborclien_usercliENt
DB_PASSWORD=your_password_here
JWT_SECRET=your_secret_key_here
```

3. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── database.js  # PostgreSQL connection pool
│   ├── middleware/      # Express middleware
│   │   └── errorHandler.js
│   ├── routes/          # API routes (coming in Phase 2)
│   ├── controllers/     # Business logic (coming in Phase 2)
│   ├── models/          # Database models (coming in Phase 2)
│   ├── services/        # External services (coming in Phase 2)
│   ├── utils/           # Helper functions (coming in Phase 2)
│   └── app.js           # Express app setup
├── uploads/             # File storage
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── README.md
└── server.js            # Entry point
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Check API and database status

### Coming in Phase 2: Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email

### Coming in Phase 3: User Management
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update current user
- `PATCH /api/users/me/password` - Change password
- `DELETE /api/users/me` - Delete account

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (coming soon)

### Environment Variables

See `.env.example` for all available configuration options.

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication (Phase 2)
- Password hashing with bcrypt (Phase 2)
- Input validation with Joi (Phase 2)

## 📊 Database

The API connects to PostgreSQL database with the following tables:

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

## 🚧 Development Phases

### ✅ Phase 1: Project Setup + Database Connection (COMPLETE)
- Express server setup
- PostgreSQL connection
- Error handling middleware
- Health check endpoint

### 🔄 Phase 2: Authentication System (NEXT)
- User registration
- Login/logout
- JWT tokens
- Password reset
- Email verification

### 📋 Phase 3: User Management
- Profile management
- Password changes
- Account deletion

### 🏢 Phase 4: Brand Management
- Multi-tenant support
- Brand CRUD operations
- Team member management

### 👥 Phase 5: Client Management
- Client CRUD operations
- Portal access management

### 📁 Phase 6: Project Management
- Project CRUD operations
- Status tracking
- Updates and milestones

### 📄 Phase 7: Document Management
- File uploads
- Document sharing
- Version control

### 💬 Phase 8: Messaging System
- Agency-client communication
- Thread management

### 💰 Phase 9: Invoice Management
- Invoice creation
- Payment tracking
- Stripe integration

### 💳 Phase 10: Subscription Management
- Plan management
- Stripe billing

## 📝 License

MIT

## 👥 Author

Faith Harbor - ClientHub Development Team
