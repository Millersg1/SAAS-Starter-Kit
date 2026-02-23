# Phase 9: Invoice Management - Progress Tracker

**Started:** February 17, 2026  
**Status:** 🚧 IN PROGRESS

## Objective

Implement a complete invoice management system with:
- Invoice creation and management
- Invoice items with calculations
- Payment tracking
- Stripe integration
- PDF generation
- Payment status management

## Requirements

### Core Features
- [ ] Invoice CRUD operations
- [ ] Invoice items management
- [ ] Automatic calculations (subtotal, tax, total)
- [ ] Payment status tracking
- [ ] Due date management
- [ ] Invoice numbering system

### Payment Integration
- [ ] Stripe payment integration
- [ ] Payment intent creation
- [ ] Payment confirmation
- [ ] Refund handling
- [ ] Payment history

### Additional Features
- [ ] PDF invoice generation
- [ ] Email invoice to clients
- [ ] Recurring invoices
- [ ] Invoice templates
- [ ] Payment reminders

## Database Schema

### Tables to Create
1. **invoices** - Main invoice data
2. **invoice_items** - Line items for invoices
3. **payments** - Payment records
4. **payment_methods** - Stored payment methods

### Fields Planning

**invoices:**
- id (UUID, PK)
- brand_id (UUID, FK)
- client_id (UUID, FK)
- project_id (UUID, FK, nullable)
- invoice_number (VARCHAR, unique)
- issue_date (DATE)
- due_date (DATE)
- status (ENUM: draft, sent, paid, overdue, cancelled)
- subtotal (DECIMAL)
- tax_rate (DECIMAL)
- tax_amount (DECIMAL)
- discount_amount (DECIMAL)
- total_amount (DECIMAL)
- amount_paid (DECIMAL)
- amount_due (DECIMAL)
- currency (VARCHAR, default 'USD')
- notes (TEXT)
- terms (TEXT)
- created_by (UUID, FK)
- created_at, updated_at

**invoice_items:**
- id (UUID, PK)
- invoice_id (UUID, FK)
- description (TEXT)
- quantity (DECIMAL)
- unit_price (DECIMAL)
- amount (DECIMAL)
- tax_rate (DECIMAL)
- tax_amount (DECIMAL)
- sort_order (INTEGER)
- created_at, updated_at

**payments:**
- id (UUID, PK)
- invoice_id (UUID, FK)
- brand_id (UUID, FK)
- client_id (UUID, FK)
- amount (DECIMAL)
- currency (VARCHAR)
- payment_method (VARCHAR)
- payment_status (ENUM: pending, completed, failed, refunded)
- stripe_payment_intent_id (VARCHAR)
- stripe_charge_id (VARCHAR)
- transaction_id (VARCHAR)
- payment_date (TIMESTAMP)
- notes (TEXT)
- created_by (UUID, FK)
- created_at, updated_at

## API Endpoints

### Invoice Management
- POST /api/invoices/:brandId - Create invoice
- GET /api/invoices/:brandId - List invoices
- GET /api/invoices/:brandId/:invoiceId - Get invoice
- PATCH /api/invoices/:brandId/:invoiceId - Update invoice
- DELETE /api/invoices/:brandId/:invoiceId - Delete invoice
- POST /api/invoices/:brandId/:invoiceId/send - Send invoice to client

### Invoice Items
- POST /api/invoices/:brandId/:invoiceId/items - Add item
- PATCH /api/invoices/:brandId/:invoiceId/items/:itemId - Update item
- DELETE /api/invoices/:brandId/:invoiceId/items/:itemId - Delete item

### Payments
- POST /api/invoices/:brandId/:invoiceId/payments - Record payment
- GET /api/invoices/:brandId/:invoiceId/payments - Get payment history
- POST /api/invoices/:brandId/:invoiceId/stripe-payment - Create Stripe payment
- POST /api/invoices/:brandId/:invoiceId/refund - Process refund

### Reports
- GET /api/invoices/:brandId/stats - Get invoice statistics
- GET /api/invoices/:brandId/overdue - Get overdue invoices

## Progress

### Step 1: Database Migration ⏳
- [ ] Create migration file
- [ ] Define invoices table
- [ ] Define invoice_items table
- [ ] Define payments table
- [ ] Add indexes
- [ ] Add triggers for calculations
- [ ] Run migration

### Step 2: Models ⏳
- [ ] Create invoiceModel.js
- [ ] Implement CRUD operations
- [ ] Implement calculation functions
- [ ] Implement payment functions
- [ ] Implement search and filters

### Step 3: Controllers ⏳
- [ ] Create invoiceController.js
- [ ] Implement invoice endpoints
- [ ] Implement item endpoints
- [ ] Implement payment endpoints
- [ ] Add validation

### Step 4: Routes ⏳
- [ ] Create invoiceRoutes.js
- [ ] Define all routes
- [ ] Add authentication middleware
- [ ] Register routes in app.js

### Step 5: Stripe Integration ⏳
- [ ] Install Stripe SDK
- [ ] Create Stripe utility
- [ ] Implement payment intent creation
- [ ] Implement webhook handling
- [ ] Test payment flow

### Step 6: Testing ⏳
- [ ] Create test data files
- [ ] Test invoice creation
- [ ] Test item management
- [ ] Test calculations
- [ ] Test payment recording
- [ ] Test Stripe integration
- [ ] Document results

## Dependencies

```json
{
  "stripe": "^14.7.0"  // Already in package.json
}
```

## Notes

- Invoice numbers should be auto-generated and unique
- Calculations should be handled by database triggers
- Payment status should auto-update based on amount_paid
- Stripe webhooks needed for payment confirmation
- PDF generation can be added in future iteration

## Next Steps

1. Create database migration
2. Implement models
3. Create controllers
4. Set up routes
5. Integrate Stripe
6. Test thoroughly

---

**Current Focus:** Creating database migration for invoices, invoice_items, and payments tables
