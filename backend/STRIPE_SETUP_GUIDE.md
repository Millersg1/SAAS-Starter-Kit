# Stripe Setup Guide for ClientHub

This guide will help you set up Stripe for subscription management in ClientHub.

---

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Node.js and npm installed
- ClientHub backend running

---

## Step 1: Get Stripe API Keys

### 1.1 Access Stripe Dashboard
1. Log in to your Stripe account at https://dashboard.stripe.com
2. Click on **Developers** in the left sidebar
3. Click on **API keys**

### 1.2 Get Test Keys (for development)
You'll see two types of keys:
- **Publishable key** (starts with `pk_test_`)
- **Secret key** (starts with `sk_test_`)

Copy both keys - you'll need them for your `.env` file.

### 1.3 Get Live Keys (for production)
Toggle the "View test data" switch to OFF to see your live keys:
- **Publishable key** (starts with `pk_live_`)
- **Secret key** (starts with `sk_live_`)

⚠️ **Important:** Never commit live keys to version control!

---

## Step 2: Create Products and Prices in Stripe

### 2.1 Create Products
1. Go to **Products** in the Stripe Dashboard
2. Click **+ Add product**
3. Create three products:

**Product 1: Basic**
- Name: `ClientHub Basic`
- Description: `Perfect for small agencies getting started`
- Pricing model: `Recurring`

**Product 2: Pro**
- Name: `ClientHub Pro`
- Description: `For growing agencies with more clients`
- Pricing model: `Recurring`

**Product 3: Enterprise**
- Name: `ClientHub Enterprise`
- Description: `Unlimited everything for large agencies`
- Pricing model: `Recurring`

### 2.2 Add Prices to Each Product
For each product, add two prices:

**Monthly Price:**
- Billing period: `Monthly`
- Price: (see pricing below)
- Currency: `USD`

**Annual Price:**
- Billing period: `Yearly`
- Price: (see pricing below)
- Currency: `USD`

**Pricing:**
- Basic: $29/month or $290/year
- Pro: $79/month or $790/year
- Enterprise: $199/month or $1990/year

### 2.3 Copy Price IDs
After creating each price, copy its Price ID (starts with `price_`). You'll need these for the database.

---

## Step 3: Update Database with Stripe Price IDs

Run this SQL to update your subscription plans with Stripe price IDs:

```sql
-- Update Basic Monthly
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_BASIC_MONTHLY_ID'
WHERE slug = 'basic-monthly';

-- Update Basic Annual
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_BASIC_ANNUAL_ID'
WHERE slug = 'basic-annual';

-- Update Pro Monthly
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_PRO_MONTHLY_ID'
WHERE slug = 'pro-monthly';

-- Update Pro Annual
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_PRO_ANNUAL_ID'
WHERE slug = 'pro-annual';

-- Update Enterprise Monthly
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_ENTERPRISE_MONTHLY_ID'
WHERE slug = 'enterprise-monthly';

-- Update Enterprise Annual
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_ENTERPRISE_ANNUAL_ID'
WHERE slug = 'enterprise-annual';
```

---

## Step 4: Set Up Webhooks

### 4.1 Create Webhook Endpoint
1. Go to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter your endpoint URL:
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
   - Production: `https://your-domain.com/api/webhooks/stripe`

### 4.2 Select Events to Listen To
Select these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.finalized`
- `payment_method.attached`
- `payment_method.detached`

### 4.3 Get Webhook Secret
After creating the webhook:
1. Click on the webhook endpoint
2. Click **Reveal** next to "Signing secret"
3. Copy the webhook secret (starts with `whsec_`)
4. Add it to your `.env` file

---

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Optional: Stripe API Version
STRIPE_API_VERSION=2023-10-16
```

---

## Step 6: Test Webhook Locally (Development)

### 6.1 Install Stripe CLI
```bash
# Windows (using Scoop)
scoop install stripe

# macOS (using Homebrew)
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### 6.2 Login to Stripe CLI
```bash
stripe login
```

### 6.3 Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

This will give you a webhook secret starting with `whsec_`. Use this for local development.

### 6.4 Trigger Test Events
In another terminal:
```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test payment succeeded
stripe trigger invoice.payment_succeeded

# Test payment failed
stripe trigger invoice.payment_failed
```

---

## Step 7: Test Stripe Integration

### 7.1 Use Stripe Test Cards
For testing payments, use these test card numbers:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Payment Requires Authentication:**
- Card: `4000 0025 0000 3155`

**Payment Declined:**
- Card: `4000 0000 0000 9995`

**Insufficient Funds:**
- Card: `4000 0000 0000 9995`

More test cards: https://stripe.com/docs/testing

### 7.2 Test Subscription Flow
1. Create a brand in ClientHub
2. Create a subscription using the API
3. Add a payment method
4. Verify the subscription in Stripe Dashboard
5. Check webhook events are being received

---

## Step 8: Production Checklist

Before going live:

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Update Stripe price IDs in database with live price IDs
- [ ] Test with real payment methods
- [ ] Set up proper error monitoring
- [ ] Configure email notifications for failed payments
- [ ] Review Stripe security best practices
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Set up proper logging for webhook events
- [ ] Test subscription cancellation flow
- [ ] Test subscription upgrade/downgrade flow
- [ ] Verify proration calculations
- [ ] Test trial period expiration

---

## Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct
2. Verify webhook secret in `.env`
3. Check server logs for errors
4. Use Stripe CLI to test locally
5. Check Stripe Dashboard > Webhooks > Attempts

### Payment Method Not Attaching
1. Verify Stripe secret key is correct
2. Check customer ID exists in Stripe
3. Verify payment method ID is valid
4. Check server logs for Stripe errors

### Subscription Not Creating
1. Verify price ID exists in Stripe
2. Check customer has payment method
3. Verify Stripe secret key
4. Check database for errors
5. Review Stripe Dashboard > Logs

### Webhook Signature Verification Failed
1. Verify webhook secret is correct
2. Check raw body is being passed to webhook handler
3. Ensure webhook route is before body parser middleware
4. Check Stripe CLI output for signature

---

## Useful Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe Testing:** https://stripe.com/docs/testing
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Stripe Dashboard:** https://dashboard.stripe.com

---

## Support

For issues with:
- **Stripe:** Contact Stripe Support at https://support.stripe.com
- **ClientHub:** Check the documentation or contact your development team

---

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all secrets**
3. **Always verify webhook signatures**
4. **Use HTTPS in production**
5. **Implement rate limiting on webhook endpoint**
6. **Log all webhook events for auditing**
7. **Monitor for suspicious activity**
8. **Keep Stripe SDK updated**
9. **Use Stripe's recommended security features**
10. **Regularly rotate API keys**

---

**Last Updated:** February 2026  
**Version:** 1.0.0
