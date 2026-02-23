import * as subscriptionModel from '../models/subscriptionModel.js';
import * as stripeUtils from '../utils/stripeUtils.js';
import * as invoiceModel from '../models/invoiceModel.js';
import { getBrandOwner, getBrandByStripeAccountId, updateBrandStripeConnect } from '../models/brandModel.js';
import { sendFailedPaymentEmail, sendTrialEndingEmail } from '../utils/emailUtils.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Handle Stripe webhook events
 * This endpoint receives events from Stripe and processes them accordingly
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripeUtils.constructWebhookEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed: - webhookController.js:25', err.message);
    return res.status(400).json({
      status: 'fail',
      message: `Webhook Error: ${err.message}`
    });
  }

  console.log(`Received webhook event: ${event.type} - webhookController.js:32`);

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type} - webhookController.js:74`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook: - webhookController.js:80', error);
    res.status(500).json({
      status: 'error',
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// ============================================
// WEBHOOK EVENT HANDLERS
// ============================================

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription) {
  console.log('Processing subscription.created - webhookController.js:97', subscription.id);

  try {
    // Get existing subscription from database
    const existingSubscription = await subscriptionModel.getSubscriptionByStripeId(subscription.id);

    if (existingSubscription) {
      // Update existing subscription
      await subscriptionModel.updateSubscription(existingSubscription.brand_id, {
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      });

      console.log('Subscription updated in database - webhookController.js:113', subscription.id);
    } else {
      console.log('Subscription not found in database - webhookController.js:115', subscription.id);
    }
  } catch (error) {
    console.error('Error handling subscription.created: - webhookController.js:118', error);
    throw error;
  }
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription.updated - webhookController.js:127', subscription.id);

  try {
    const existingSubscription = await subscriptionModel.getSubscriptionByStripeId(subscription.id);

    if (!existingSubscription) {
      console.log('Subscription not found in database - webhookController.js:133', subscription.id);
      return;
    }

    // Update subscription in database
    await subscriptionModel.updateSubscription(existingSubscription.brand_id, {
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null
    });

    console.log('Subscription updated successfully - webhookController.js:147', subscription.id);
  } catch (error) {
    console.error('Error handling subscription.updated: - webhookController.js:149', error);
    throw error;
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription.deleted - webhookController.js:158', subscription.id);

  try {
    const existingSubscription = await subscriptionModel.getSubscriptionByStripeId(subscription.id);

    if (!existingSubscription) {
      console.log('Subscription not found in database - webhookController.js:164', subscription.id);
      return;
    }

    // Update subscription status to canceled
    await subscriptionModel.updateSubscription(existingSubscription.brand_id, {
      status: 'canceled',
      ended_at: new Date()
    });

    console.log('Subscription marked as canceled - webhookController.js:174', subscription.id);
  } catch (error) {
    console.error('Error handling subscription.deleted: - webhookController.js:176', error);
    throw error;
  }
}

/**
 * Handle invoice payment succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Processing invoice.payment_succeeded - webhookController.js:185', invoice.id);

  try {
    // Get subscription from database
    const subscription = await subscriptionModel.getSubscriptionByStripeId(invoice.subscription);

    if (!subscription) {
      console.log('Subscription not found for invoice - webhookController.js:192', invoice.subscription);
      return;
    }

    // Check if billing record already exists
    const existingRecord = await subscriptionModel.getBillingRecordByStripeInvoiceId(invoice.id);

    if (existingRecord) {
      // Update existing record
      await subscriptionModel.updateBillingRecord(invoice.id, {
        status: 'paid',
        paid_at: new Date(invoice.status_transitions.paid_at * 1000)
      });
    } else {
      // Create new billing record
      await subscriptionModel.addBillingRecord({
        brand_id: subscription.brand_id,
        subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        stripe_charge_id: invoice.charge,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency.toUpperCase(),
        status: 'paid',
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        billing_reason: invoice.billing_reason,
        period_start: new Date(invoice.period_start * 1000),
        period_end: new Date(invoice.period_end * 1000),
        paid_at: new Date(invoice.status_transitions.paid_at * 1000)
      });
    }

    console.log('Invoice payment recorded successfully - webhookController.js:224', invoice.id);
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded: - webhookController.js:226', error);
    throw error;
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  console.log('Processing invoice.payment_failed - webhookController.js:235', invoice.id);

  try {
    const subscription = await subscriptionModel.getSubscriptionByStripeId(invoice.subscription);

    if (!subscription) {
      console.log('Subscription not found for invoice - webhookController.js:241', invoice.subscription);
      return;
    }

    // Update subscription status if needed
    if (invoice.attempt_count >= 3) {
      await subscriptionModel.updateSubscription(subscription.brand_id, {
        status: 'past_due'
      });
      console.log('Subscription marked as past_due - webhookController.js:250', subscription.id);
    }

    // Record failed payment attempt
    const existingRecord = await subscriptionModel.getBillingRecordByStripeInvoiceId(invoice.id);

    if (!existingRecord) {
      await subscriptionModel.addBillingRecord({
        brand_id: subscription.brand_id,
        subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'open',
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        billing_reason: invoice.billing_reason,
        period_start: new Date(invoice.period_start * 1000),
        period_end: new Date(invoice.period_end * 1000)
      });
    }

    console.log('Failed payment recorded - webhookController.js:272', invoice.id);

    // Notify brand owner about failed payment
    try {
      const owner = await getBrandOwner(subscription.brand_id);
      if (owner) {
        await sendFailedPaymentEmail(
          owner.email, owner.name,
          subscription.brand_id, invoice.amount_due / 100, invoice.currency?.toUpperCase()
        );
      }
    } catch (emailErr) {
      console.error('Failed to send failed payment email:', emailErr);
    }
  } catch (error) {
    console.error('Error handling invoice.payment_failed: - webhookController.js:276', error);
    throw error;
  }
}

/**
 * Handle invoice finalized event
 */
async function handleInvoiceFinalized(invoice) {
  console.log('Processing invoice.finalized - webhookController.js:285', invoice.id);

  try {
    const subscription = await subscriptionModel.getSubscriptionByStripeId(invoice.subscription);

    if (!subscription) {
      console.log('Subscription not found for invoice - webhookController.js:291', invoice.subscription);
      return;
    }

    // Create billing record for finalized invoice
    const existingRecord = await subscriptionModel.getBillingRecordByStripeInvoiceId(invoice.id);

    if (!existingRecord) {
      await subscriptionModel.addBillingRecord({
        brand_id: subscription.brand_id,
        subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        billing_reason: invoice.billing_reason,
        period_start: new Date(invoice.period_start * 1000),
        period_end: new Date(invoice.period_end * 1000)
      });

      console.log('Invoice finalized and recorded - webhookController.js:313', invoice.id);
    }
  } catch (error) {
    console.error('Error handling invoice.finalized: - webhookController.js:316', error);
    throw error;
  }
}

/**
 * Handle payment method attached event
 */
async function handlePaymentMethodAttached(paymentMethod) {
  console.log('Processing payment_method.attached - webhookController.js:325', paymentMethod.id);

  try {
    // Payment method attachment is typically handled in the controller
    // This webhook is mainly for logging/monitoring
    console.log('Payment method attached to customer - webhookController.js:330', paymentMethod.customer);
  } catch (error) {
    console.error('Error handling payment_method.attached: - webhookController.js:332', error);
    throw error;
  }
}

/**
 * Handle payment method detached event
 */
async function handlePaymentMethodDetached(paymentMethod) {
  console.log('Processing payment_method.detached - webhookController.js:341', paymentMethod.id);

  try {
    // Remove payment method from database if it exists
    // This is a safety measure in case the detachment wasn't done through our API
    console.log('Payment method detached from customer - webhookController.js:346', paymentMethod.customer);
  } catch (error) {
    console.error('Error handling payment_method.detached: - webhookController.js:348', error);
    throw error;
  }
}

/**
 * Handle trial will end event (3 days before trial ends)
 */
async function handleTrialWillEnd(subscription) {
  console.log('Processing customer.subscription.trial_will_end - webhookController.js:357', subscription.id);

  try {
    const existingSubscription = await subscriptionModel.getSubscriptionByStripeId(subscription.id);

    if (!existingSubscription) {
      console.log('Subscription not found in database - webhookController.js:363', subscription.id);
      return;
    }

    console.log('Trial ending soon for subscription - webhookController.js:367', subscription.id);

    // Notify brand owner that trial is ending
    try {
      const owner = await getBrandOwner(existingSubscription.brand_id);
      if (owner) {
        const trialEndDate = new Date(subscription.trial_end * 1000);
        await sendTrialEndingEmail(owner.email, owner.name, existingSubscription.brand_id, trialEndDate);
      }
    } catch (emailErr) {
      console.error('Failed to send trial ending email:', emailErr);
    }
  } catch (error) {
    console.error('Error handling customer.subscription.trial_will_end: - webhookController.js:372', error);
    throw error;
  }
}

/**
 * Handle Stripe Checkout session completed — records invoice payment when
 * a portal client pays via the hosted Checkout page.
 */
async function handleCheckoutSessionCompleted(session) {
  console.log('Processing checkout.session.completed - webhookController.js', session.id);

  if (session.metadata?.type !== 'invoice_payment') return;

  try {
    const { invoiceId, brandId, clientId } = session.metadata;

    await invoiceModel.recordPayment({
      invoice_id: invoiceId,
      brand_id: brandId,
      client_id: clientId,
      amount: session.amount_total / 100,
      currency: session.currency.toUpperCase(),
      payment_method: 'stripe',
      payment_status: 'completed',
      stripe_payment_intent_id: session.payment_intent,
      payment_date: new Date(),
    });

    console.log('Invoice payment recorded from Checkout session - webhookController.js', invoiceId);
  } catch (error) {
    console.error('Error handling checkout.session.completed: - webhookController.js', error);
    throw error;
  }
}

/**
 * Handle Stripe Connect account.updated event
 * Keeps the brand's Connect status columns in sync with Stripe.
 */
async function handleConnectAccountUpdated(account) {
  console.log('Processing account.updated for Connect account - webhookController.js', account.id);

  try {
    const brand = await getBrandByStripeAccountId(account.id);
    if (!brand) {
      console.log('No brand found for Connect account:', account.id);
      return;
    }

    let status = 'onboarding_started';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending_verification';
    } else if (account.requirements?.disabled_reason) {
      status = 'restricted';
    }

    await updateBrandStripeConnect(brand.id, {
      stripe_connect_status: status,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_charges_enabled: account.charges_enabled,
    });

    console.log(`Brand ${brand.id} Connect status updated to: ${status} - webhookController.js`);
  } catch (error) {
    console.error('Error handling account.updated: - webhookController.js', error);
    throw error;
  }
}
