# Phase 10: Subscription Management - Progress Tracker

**Started:** February 17, 2026  
**Status:** 🚧 IN PROGRESS

## Objective

Implement a complete subscription management system with:
- Subscription plans (Basic, Pro, Enterprise)
- Stripe billing integration
- Recurring payments
- Plan upgrades/downgrades
- Usage tracking
- Billing history
- Payment method management
- Webhook handling

## Requirements

### Core Features
- [ ] Subscription plan management
- [ ] Stripe customer creation
- [ ] Stripe subscription creation
- [ ] Plan upgrade/downgrade
- [ ] Subscription cancellation
- [ ] Payment method management
- [ ] Billing history
- [ ] Usage tracking

### Stripe Integration
- [ ] Stripe API setup
- [ ] Customer creation
- [ ] Subscription creation
- [ ] Payment intent handling
- [ ] Webhook endpoint
- [ ] Webhook signature verification
- [ ] Event handling (payment success, failure, etc.)

### Additional Features
- [ ] Trial periods
- [ ] Proration on upgrades/downgrades
- [ ] Invoice generation
- [ ] Payment retry logic
- [ ] Subscription status tracking

## Database Schema

### Tables to Create
1. **subscription_plans** - Available subscription plans
2. **subscriptions** - Active subscriptions
3. **payment_methods** - Stored payment methods
4. **billing_history** - Payment history

### Fields Planning

**subscription_plans:**
- id (UUID, PK)
- name (VARCHAR) - Basic, Pro, Enterprise
- slug (VARCHAR, unique)
- description (TEXT)
- price (DECIMAL)
- billing_interval (ENUM: month, year)
- features (JSONB)
- stripe_price_id (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at

**subscriptions:**
- id (UUID, PK)
- brand_id (UUID, FK → brands)
- plan_id (UUID, FK → subscription_plans)
- stripe_subscription_id (VARCHAR)
- stripe_customer_id (VARCHAR)
- status (ENUM: active, past_due, canceled, incomplete, trialing)
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- cancel_at_period_end (BOOLEAN)
- canceled_at (TIMESTAMP)
- trial_start (TIMESTAMP)
- trial_end (TIMESTAMP)
- created_at, updated_at

**payment_methods:**
- id (UUID, PK)
- brand_id (UUID, FK → brands)
- stripe_payment_method_id (VARCHAR)
- type (VARCHAR) - card, bank_account
- card_brand (VARCHAR)
- card_last4 (VARCHAR)
- card_exp_month (INTEGER)
- card_exp_year (INTEGER)
- is_default (BOOLEAN)
- created_at, updated_at

**billing_history:**
- id (UUID, PK)
- brand_id (UUID, FK → brands)
- subscription_id (UUID, FK → subscriptions)
- stripe_invoice_id (VARCHAR)
- amount (DECIMAL)
- currency (VARCHAR)
- status (ENUM: paid, open, void, uncollectible)
- invoice_pdf (VARCHAR)
- billing_reason (VARCHAR)
- period_start (TIMESTAMP)
- period_end (TIMESTAMP)
- created_at, updated_at

## API Endpoints

### Subscription Plans
- GET /api/subscriptions/plans - List available plans
- GET /api/subscriptions/plans/:planId - Get plan details

### Subscriptions
- POST /api/subscriptions/:brandId - Create subscription
- GET /api/subscriptions/:brandId - Get current subscription
- PATCH /api/subscriptions/:brandId - Update subscription (upgrade/downgrade)
- DELETE /api/subscriptions/:brandId - Cancel subscription
- POST /api/subscriptions/:brandId/resume - Resume canceled subscription

### Payment Methods
- POST /api/subscriptions/:brandId/payment-methods - Add payment method
- GET /api/subscriptions/:brandId/payment-methods - List payment methods
- PATCH /api/subscriptions/:brandId/payment-methods/:methodId - Set default
- DELETE /api/subscriptions/:brandId/payment-methods/:methodId - Remove method

### Billing
- GET /api/subscriptions/:brandId/billing-history - Get billing history
- GET /api/subscriptions/:brandId/upcoming-invoice - Get upcoming invoice

### Webhooks
- POST /api/webhooks/stripe - Stripe webhook endpoint

## Progress

### Step 1: Database Migration ⏳
- [ ] Create migration file
- [ ] Define subscription_plans table
- [ ] Define subscriptions table
- [ ] Define payment_methods table
- [ ] Define billing_history table
- [ ] Add indexes
- [ ] Seed initial plans
- [ ] Run migration

### Step 2: Stripe Setup ⏳
- [ ] Install Stripe SDK (already in package.json)
- [ ] Create Stripe utility
- [ ] Set up API keys
- [ ] Create test products/prices in Stripe

### Step 3: Models ⏳
- [ ] Create subscriptionModel.js
- [ ] Implement plan functions
- [ ] Implement subscription CRUD
- [ ] Implement payment method functions
- [ ] Implement billing history functions

### Step 4: Controllers ⏳
- [ ] Create subscriptionController.js
- [ ] Implement plan endpoints
- [ ] Implement subscription endpoints
- [ ] Implement payment method endpoints
- [ ] Implement billing endpoints
- [ ] Implement webhook handler

### Step 5: Routes ⏳
- [ ] Create subscriptionRoutes.js
- [ ] Define all routes
- [ ] Add authentication middleware
- [ ] Register routes in app.js

### Step 6: Webhook Integration ⏳
- [ ] Create webhook endpoint
- [ ] Implement signature verification
- [ ] Handle payment success
- [ ] Handle payment failure
- [ ] Handle subscription updates
- [ ] Handle subscription cancellation

### Step 7: Testing ⏳
- [ ] Create test data files
- [ ] Test plan retrieval
- [ ] Test subscription creation
- [ ] Test payment method management
- [ ] Test plan upgrades/downgrades
- [ ] Test cancellation
- [ ] Test webhook events
- [ ] Document results

## Dependencies

```json
{
  "stripe": "^14.7.0"  // Already in package.json
}
```

## Stripe Configuration

### Environment Variables Needed
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Products to Create
1. **Basic Plan**
   - Price: $29/month or $290/year
   - Features: 5 clients, 10 projects, 10GB storage

2. **Pro Plan**
   - Price: $79/month or $790/year
   - Features: 25 clients, 50 projects, 50GB storage

3. **Enterprise Plan**
   - Price: $199/month or $1990/year
   - Features: Unlimited clients, projects, storage

## Notes

- Use Stripe test mode for development
- Implement idempotency for webhook events
- Handle proration automatically via Stripe
- Store Stripe IDs for all entities
- Implement proper error handling for failed payments
- Consider implementing usage-based billing in future

## Next Steps

1. Create database migration
2. Set up Stripe configuration
3. Implement models
4. Create controllers
5. Set up routes
6. Implement webhooks
7. Test thoroughly

---

**Current Focus:** Creating database migration for subscription tables
