/**
 * Stripe Product Creation Script
 * 
 * This script creates 6 subscription products in your Stripe account
 * and updates your database with the price IDs.
 * 
 * Usage: node create-stripe-products.js
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import { query } from './src/config/database.js';

dotenv.config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Product definitions matching your subscription plans
const products = [
  {
    name: 'SAAS Surface Basic Monthly',
    description: 'Perfect for small agencies getting started',
    price: 2900, // $29.00 in cents
    interval: 'month',
    slug: 'basic-monthly',
    features: [
      'Up to 10 clients',
      'Up to 20 projects',
      '5GB storage',
      'Email support',
      'Basic analytics'
    ]
  },
  {
    name: 'SAAS Surface Basic Annual',
    description: 'Perfect for small agencies getting started (Annual billing)',
    price: 29000, // $290.00 in cents
    interval: 'year',
    slug: 'basic-annual',
    features: [
      'Up to 10 clients',
      'Up to 20 projects',
      '5GB storage',
      'Email support',
      'Basic analytics',
      'Save 17% with annual billing'
    ]
  },
  {
    name: 'SAAS Surface Pro Monthly',
    description: 'For growing agencies with more clients',
    price: 7900, // $79.00 in cents
    interval: 'month',
    slug: 'pro-monthly',
    features: [
      'Up to 50 clients',
      'Up to 100 projects',
      '50GB storage',
      'Priority email support',
      'Advanced analytics',
      'Custom branding',
      'API access'
    ]
  },
  {
    name: 'SAAS Surface Pro Annual',
    description: 'For growing agencies with more clients (Annual billing)',
    price: 79000, // $790.00 in cents
    interval: 'year',
    slug: 'pro-annual',
    features: [
      'Up to 50 clients',
      'Up to 100 projects',
      '50GB storage',
      'Priority email support',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Save 17% with annual billing'
    ]
  },
  {
    name: 'SAAS Surface Enterprise Monthly',
    description: 'For large agencies with unlimited needs',
    price: 19900, // $199.00 in cents
    interval: 'month',
    slug: 'enterprise-monthly',
    features: [
      'Unlimited clients',
      'Unlimited projects',
      'Unlimited storage',
      '24/7 phone & email support',
      'Advanced analytics & reporting',
      'White-label solution',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee'
    ]
  },
  {
    name: 'SAAS Surface Enterprise Annual',
    description: 'For large agencies with unlimited needs (Annual billing)',
    price: 199000, // $1990.00 in cents
    interval: 'year',
    slug: 'enterprise-annual',
    features: [
      'Unlimited clients',
      'Unlimited projects',
      'Unlimited storage',
      '24/7 phone & email support',
      'Advanced analytics & reporting',
      'White-label solution',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Save 17% with annual billing'
    ]
  }
];

async function createStripeProducts() {
  console.log('🚀 Starting Stripe Product Creation...\n - create-stripe-products.js:125');
  console.log('Using Stripe Secret Key: - create-stripe-products.js:126', process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...\n');

  const results = [];

  for (const productDef of products) {
    try {
      console.log(`📦 Creating product: ${productDef.name} - create-stripe-products.js:132`);

      // Create the product
      const product = await stripe.products.create({
        name: productDef.name,
        description: productDef.description,
        metadata: {
          slug: productDef.slug,
          features: productDef.features.join('|')
        }
      });

      console.log(`✓ Product created: ${product.id} - create-stripe-products.js:144`);

      // Create the price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: productDef.price,
        currency: 'usd',
        recurring: {
          interval: productDef.interval
        },
        metadata: {
          slug: productDef.slug
        }
      });

      console.log(`✓ Price created: ${price.id} - create-stripe-products.js:159`);
      console.log(`💰 Amount: ${(productDef.price / 100).toFixed(2)}/${productDef.interval} - create-stripe-products.js:160`);

      // Update database
      const updateResult = await query(
        'UPDATE subscription_plans SET stripe_price_id = $1 WHERE slug = $2 RETURNING *',
        [price.id, productDef.slug]
      );

      if (updateResult.rows.length > 0) {
        console.log(`✓ Database updated for ${productDef.slug} - create-stripe-products.js:169`);
      } else {
        console.log(`⚠️  Warning: No database record found for ${productDef.slug} - create-stripe-products.js:171`);
      }

      results.push({
        slug: productDef.slug,
        name: productDef.name,
        productId: product.id,
        priceId: price.id,
        amount: productDef.price,
        interval: productDef.interval,
        success: true
      });

      console.log(`✅ ${productDef.name}  COMPLETE\n - create-stripe-products.js:184`);

    } catch (error) {
      console.error(`❌ Error creating ${productDef.name}: - create-stripe-products.js:187`, error.message);
      results.push({
        slug: productDef.slug,
        name: productDef.name,
        success: false,
        error: error.message
      });
      console.log('');
    }
  }

  return results;
}

async function verifyDatabase() {
  console.log('\n📊 Verifying Database Updates...\n - create-stripe-products.js:202');
  
  try {
    const result = await query(
      'SELECT id, name, slug, price, billing_period, stripe_price_id FROM subscription_plans ORDER BY id'
    );

    console.log('Current Subscription Plans: - create-stripe-products.js:209');
    console.log('─ - create-stripe-products.js:210'.repeat(100));
    result.rows.forEach(plan => {
      const priceDisplay = `$${plan.price}/${plan.billing_period}`;
      const stripeId = plan.stripe_price_id || 'NOT SET';
      console.log(`${plan.id}. ${plan.name.padEnd(35)} ${priceDisplay.padEnd(15)} ${stripeId} - create-stripe-products.js:214`);
    });
    console.log('─ - create-stripe-products.js:216'.repeat(100));

    const missingPriceIds = result.rows.filter(plan => !plan.stripe_price_id);
    if (missingPriceIds.length > 0) {
      console.log(`\n⚠️  Warning: ${missingPriceIds.length} plan(s) still missing Stripe price IDs - create-stripe-products.js:220`);
    } else {
      console.log('\n✅ All plans have Stripe price IDs configured! - create-stripe-products.js:222');
    }

  } catch (error) {
    console.error('❌ Error verifying database: - create-stripe-products.js:226', error.message);
  }
}

async function main() {
  console.log('═ - create-stripe-products.js:231'.repeat(100));
  console.log('STRIPE PRODUCT CREATION SCRIPT - create-stripe-products.js:232');
  console.log('═ - create-stripe-products.js:233'.repeat(100));
  console.log('');

  // Check if Stripe key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in .env file - create-stripe-products.js:238');
    console.error('Please add your Stripe secret key to the .env file and try again. - create-stripe-products.js:239');
    process.exit(1);
  }

  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ Error: Invalid Stripe secret key format - create-stripe-products.js:244');
    console.error('Stripe secret keys should start with "sk_test_" or "sk_live_" - create-stripe-products.js:245');
    process.exit(1);
  }

  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  console.log(`🔑 Mode: ${isLiveMode ? '🔴 LIVE' : '🟡 TEST'} - create-stripe-products.js:250`);
  
  if (isLiveMode) {
    console.log('⚠️  WARNING: You are using LIVE Stripe keys! - create-stripe-products.js:253');
    console.log('⚠️  Real products will be created in your Stripe account.\n - create-stripe-products.js:254');
  } else {
    console.log('ℹ️  Using TEST mode  products will be created in test mode.\n - create-stripe-products.js:256');
  }

  try {
    // Create products
    const results = await createStripeProducts();

    // Summary
    console.log('\n═ - create-stripe-products.js:264'.repeat(100));
    console.log('SUMMARY - create-stripe-products.js:265');
    console.log('═ - create-stripe-products.js:266'.repeat(100));
    console.log('');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successfully created: ${successful.length}/${results.length} products - create-stripe-products.js:272`);
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}/${results.length} products - create-stripe-products.js:274`);
      console.log('\nFailed products: - create-stripe-products.js:275');
      failed.forEach(f => {
        console.log(`${f.name}: ${f.error} - create-stripe-products.js:277`);
      });
    }

    if (successful.length > 0) {
      console.log('\n📋 Created Products: - create-stripe-products.js:282');
      console.log('─ - create-stripe-products.js:283'.repeat(100));
      successful.forEach(r => {
        console.log(`${r.name} - create-stripe-products.js:285`);
        console.log(`Product ID: ${r.productId} - create-stripe-products.js:286`);
        console.log(`Price ID:   ${r.priceId} - create-stripe-products.js:287`);
        console.log(`Amount:     ${(r.amount / 100).toFixed(2)}/${r.interval} - create-stripe-products.js:288`);
        console.log('');
      });
    }

    // Verify database
    await verifyDatabase();

    console.log('\n═ - create-stripe-products.js:296'.repeat(100));
    console.log('✅ STRIPE PRODUCT CREATION COMPLETE! - create-stripe-products.js:297');
    console.log('═ - create-stripe-products.js:298'.repeat(100));
    console.log('');
    console.log('Next steps: - create-stripe-products.js:300');
    console.log('1. ✅ Products created in Stripe - create-stripe-products.js:301');
    console.log('2. ✅ Database updated with price IDs - create-stripe-products.js:302');
    console.log('3. ⏭️  Configure webhook endpoint in Stripe Dashboard - create-stripe-products.js:303');
    console.log('4. ⏭️  Test subscription creation - create-stripe-products.js:304');
    console.log('');
    console.log('View your products: https://dashboard.stripe.com/products - create-stripe-products.js:306');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error: - create-stripe-products.js:310', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
main();
