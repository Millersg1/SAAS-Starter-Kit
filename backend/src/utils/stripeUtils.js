import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config();

// Use CJS require to load Stripe — avoids ESM parallel file opens (EMFILE on cPanel/LVE)
const require = createRequire(import.meta.url);
const { Stripe } = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Create a Stripe customer
 */
export const createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer: - stripeUtils.js:23', error);
    throw error;
  }
};

/**
 * Create a subscription
 */
export const createSubscription = async (customerId, priceId, paymentMethodId = null, trialDays = null) => {
  try {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    if (paymentMethodId) {
      subscriptionData.default_payment_method = paymentMethodId;
    }

    if (trialDays) {
      subscriptionData.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);
    return subscription;
  } catch (error) {
    console.error('Error creating subscription: - stripeUtils.js:52', error);
    throw error;
  }
};

/**
 * Update a subscription (upgrade/downgrade)
 */
export const updateSubscription = async (subscriptionId, newPriceId, prorationBehavior = 'create_prorations') => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: prorationBehavior,
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription: - stripeUtils.js:74', error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionId, cancelAtPeriodEnd = true) => {
  try {
    if (cancelAtPeriodEnd) {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } else {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling subscription: - stripeUtils.js:94', error);
    throw error;
  }
};

/**
 * Resume a canceled subscription
 */
export const resumeSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return subscription;
  } catch (error) {
    console.error('Error resuming subscription: - stripeUtils.js:109', error);
    throw error;
  }
};

/**
 * Attach payment method to customer
 */
export const attachPaymentMethod = async (paymentMethodId, customerId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    return paymentMethod;
  } catch (error) {
    console.error('Error attaching payment method: - stripeUtils.js:124', error);
    throw error;
  }
};

/**
 * Detach payment method from customer
 */
export const detachPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('Error detaching payment method: - stripeUtils.js:137', error);
    throw error;
  }
};

/**
 * Set default payment method for customer
 */
export const setDefaultPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    return customer;
  } catch (error) {
    console.error('Error setting default payment method: - stripeUtils.js:154', error);
    throw error;
  }
};

/**
 * List customer payment methods
 */
export const listPaymentMethods = async (customerId, type = 'card') => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
    return paymentMethods.data;
  } catch (error) {
    console.error('Error listing payment methods: - stripeUtils.js:170', error);
    throw error;
  }
};

/**
 * Retrieve upcoming invoice
 */
export const getUpcomingInvoice = async (customerId, subscriptionId = null) => {
  try {
    const params = { customer: customerId };
    if (subscriptionId) {
      params.subscription = subscriptionId;
    }
    
    const invoice = await stripe.invoices.retrieveUpcoming(params);
    return invoice;
  } catch (error) {
    console.error('Error retrieving upcoming invoice: - stripeUtils.js:188', error);
    throw error;
  }
};

/**
 * List customer invoices
 */
export const listInvoices = async (customerId, limit = 10) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error listing invoices: - stripeUtils.js:204', error);
    throw error;
  }
};

/**
 * Create a setup intent for saving payment method
 */
export const createSetupIntent = async (customerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent: - stripeUtils.js:220', error);
    throw error;
  }
};

/**
 * Construct webhook event
 */
export const constructWebhookEvent = (payload, signature, webhookSecret) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Error constructing webhook event: - stripeUtils.js:237', error);
    throw error;
  }
};

/**
 * Retrieve subscription
 */
export const retrieveSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription: - stripeUtils.js:250', error);
    throw error;
  }
};

/**
 * Retrieve customer
 */
export const retrieveCustomer = async (customerId) => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error) {
    console.error('Error retrieving customer: - stripeUtils.js:263', error);
    throw error;
  }
};

/**
 * Create a payment intent
 */
export const createPaymentIntent = async (amount, currency, customerId, metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent: - stripeUtils.js:284', error);
    throw error;
  }
};

// ============================================
// STRIPE CONNECT EXPRESS
// ============================================

/**
 * Create a Stripe Connect Express account for an agency
 */
export const createConnectAccount = async (email, metadata = {}) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account;
  } catch (error) {
    console.error('Error creating Connect account: - stripeUtils.js', error);
    throw error;
  }
};

/**
 * Create a hosted onboarding link for a Connect account
 */
export const createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link;
  } catch (error) {
    console.error('Error creating account link: - stripeUtils.js', error);
    throw error;
  }
};

/**
 * Retrieve a Connect account and its current capabilities
 */
export const retrieveConnectAccount = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Error retrieving Connect account: - stripeUtils.js', error);
    throw error;
  }
};

/**
 * Create a Stripe Checkout Session routed to a connected account
 * Money goes to the connected account; platform keeps applicationFeeAmount
 */
export const createConnectCheckoutSession = async ({
  connectedAccountId,
  lineItems,
  successUrl,
  cancelUrl,
  metadata,
  applicationFeeAmount,
}) => {
  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: { application_fee_amount: applicationFeeAmount },
      },
      { stripeAccount: connectedAccountId }
    );
    return session;
  } catch (error) {
    console.error('Error creating Connect checkout session: - stripeUtils.js', error);
    throw error;
  }
};

export { stripe as default };
