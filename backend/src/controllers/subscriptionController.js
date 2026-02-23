import * as subscriptionModel from '../models/subscriptionModel.js';
import * as brandModel from '../models/brandModel.js';
import * as stripeUtils from '../utils/stripeUtils.js';

// ============================================
// SUBSCRIPTION PLANS
// ============================================

/**
 * Get all available subscription plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await subscriptionModel.getAllPlans();

    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: { plans }
    });
  } catch (error) {
    console.error('Error getting plans: - subscriptionController.js:22', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve subscription plans',
      error: error.message
    });
  }
};

/**
 * Get single plan by ID
 */
export const getPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await subscriptionModel.getPlanById(planId);

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Plan not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { plan }
    });
  } catch (error) {
    console.error('Error getting plan: - subscriptionController.js:51', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve plan',
      error: error.message
    });
  }
};

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Create a new subscription
 */
export const createSubscription = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { plan_id, payment_method_id, trial_days } = req.body;

    // Verify brand membership and ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can manage subscriptions'
      });
    }

    // Check if brand already has a subscription
    const existingSubscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (existingSubscription) {
      return res.status(400).json({
        status: 'fail',
        message: 'Brand already has an active subscription'
      });
    }

    // Get plan details
    const plan = await subscriptionModel.getPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Plan not found'
      });
    }

    // Get brand details
    const brand = await brandModel.getBrandById(brandId);
    
    // Create or get Stripe customer
    let stripeCustomerId;
    const existingCustomer = await subscriptionModel.getSubscriptionByBrandId(brandId);
    
    if (existingCustomer && existingCustomer.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripeUtils.createCustomer(
        req.user.email,
        brand.name,
        { brand_id: brandId }
      );
      stripeCustomerId = customer.id;
    }

    // Attach payment method if provided
    if (payment_method_id) {
      await stripeUtils.attachPaymentMethod(payment_method_id, stripeCustomerId);
      await stripeUtils.setDefaultPaymentMethod(stripeCustomerId, payment_method_id);
    }

    // Create Stripe subscription
    const stripeSubscription = await stripeUtils.createSubscription(
      stripeCustomerId,
      plan.stripe_price_id,
      payment_method_id,
      trial_days
    );

    // Create subscription in database
    const subscription = await subscriptionModel.createSubscription({
      brand_id: brandId,
      plan_id: plan_id,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeCustomerId,
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      metadata: { created_by: userId }
    });

    // Save payment method if provided
    if (payment_method_id) {
      const paymentMethod = await stripeUtils.retrievePaymentMethod(payment_method_id);
      await subscriptionModel.addPaymentMethod({
        brand_id: brandId,
        stripe_payment_method_id: payment_method_id,
        type: paymentMethod.type,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_exp_month: paymentMethod.card?.exp_month,
        card_exp_year: paymentMethod.card?.exp_year,
        is_default: true
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Subscription created successfully',
      data: { 
        subscription,
        client_secret: stripeSubscription.latest_invoice?.payment_intent?.client_secret
      }
    });
  } catch (error) {
    console.error('Error creating subscription: - subscriptionController.js:170', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create subscription',
      error: error.message
    });
  }
};

/**
 * Get current subscription for brand
 */
export const getSubscription = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const subscription = await subscriptionModel.getSubscriptionByBrandId(brandId);

    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { subscription }
    });
  } catch (error) {
    console.error('Error getting subscription: - subscriptionController.js:210', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve subscription',
      error: error.message
    });
  }
};

/**
 * Update subscription (upgrade/downgrade)
 */
export const updateSubscription = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { new_plan_id } = req.body;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can update subscriptions'
      });
    }

    // Get current subscription
    const currentSubscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!currentSubscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    // Get new plan
    const newPlan = await subscriptionModel.getPlanById(new_plan_id);
    if (!newPlan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Plan not found'
      });
    }

    // Update Stripe subscription
    const updatedStripeSubscription = await stripeUtils.updateSubscription(
      currentSubscription.stripe_subscription_id,
      newPlan.stripe_price_id
    );

    // Update database
    const subscription = await subscriptionModel.updateSubscription(brandId, {
      plan_id: new_plan_id,
      status: updatedStripeSubscription.status,
      current_period_start: new Date(updatedStripeSubscription.current_period_start * 1000),
      current_period_end: new Date(updatedStripeSubscription.current_period_end * 1000)
    });

    res.status(200).json({
      status: 'success',
      message: 'Subscription updated successfully',
      data: { subscription }
    });
  } catch (error) {
    console.error('Error updating subscription: - subscriptionController.js:275', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update subscription',
      error: error.message
    });
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { cancel_at_period_end = true } = req.body;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can cancel subscriptions'
      });
    }

    // Get current subscription
    const currentSubscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!currentSubscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    // Cancel in Stripe
    await stripeUtils.cancelSubscription(
      currentSubscription.stripe_subscription_id,
      cancel_at_period_end
    );

    // Update database
    const subscription = await subscriptionModel.cancelSubscription(
      brandId,
      cancel_at_period_end,
      cancel_at_period_end ? null : new Date()
    );

    res.status(200).json({
      status: 'success',
      message: cancel_at_period_end 
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
      data: { subscription }
    });
  } catch (error) {
    console.error('Error canceling subscription: - subscriptionController.js:332', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

/**
 * Resume canceled subscription
 */
export const resumeSubscription = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can resume subscriptions'
      });
    }

    // Get current subscription
    const currentSubscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!currentSubscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No subscription found'
      });
    }

    if (!currentSubscription.cancel_at_period_end) {
      return res.status(400).json({
        status: 'fail',
        message: 'Subscription is not scheduled for cancellation'
      });
    }

    // Resume in Stripe
    await stripeUtils.resumeSubscription(currentSubscription.stripe_subscription_id);

    // Update database
    const subscription = await subscriptionModel.updateSubscription(brandId, {
      cancel_at_period_end: false,
      canceled_at: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Subscription resumed successfully',
      data: { subscription }
    });
  } catch (error) {
    console.error('Error resuming subscription: - subscriptionController.js:389', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resume subscription',
      error: error.message
    });
  }
};

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Add payment method
 */
export const addPaymentMethod = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const { payment_method_id } = req.body;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can manage payment methods'
      });
    }

    // Get subscription to get customer ID
    const subscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    // Attach payment method in Stripe
    await stripeUtils.attachPaymentMethod(payment_method_id, subscription.stripe_customer_id);
    
    // Get payment method details
    const stripePaymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Save to database
    const paymentMethod = await subscriptionModel.addPaymentMethod({
      brand_id: brandId,
      stripe_payment_method_id: payment_method_id,
      type: stripePaymentMethod.type,
      card_brand: stripePaymentMethod.card?.brand,
      card_last4: stripePaymentMethod.card?.last4,
      card_exp_month: stripePaymentMethod.card?.exp_month,
      card_exp_year: stripePaymentMethod.card?.exp_year,
      is_default: false
    });

    res.status(201).json({
      status: 'success',
      message: 'Payment method added successfully',
      data: { payment_method: paymentMethod }
    });
  } catch (error) {
    console.error('Error adding payment method: - subscriptionController.js:453', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add payment method',
      error: error.message
    });
  }
};

/**
 * Get payment methods
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const paymentMethods = await subscriptionModel.getPaymentMethodsByBrandId(brandId);

    res.status(200).json({
      status: 'success',
      results: paymentMethods.length,
      data: { payment_methods: paymentMethods }
    });
  } catch (error) {
    console.error('Error getting payment methods: - subscriptionController.js:487', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve payment methods',
      error: error.message
    });
  }
};

/**
 * Set default payment method
 */
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { brandId, methodId } = req.params;
    const userId = req.user.id;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can set default payment method'
      });
    }

    // Get payment method
    const paymentMethod = await subscriptionModel.getPaymentMethodById(methodId);
    if (!paymentMethod || paymentMethod.brand_id !== brandId) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment method not found'
      });
    }

    // Get subscription
    const subscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    // Set default in Stripe
    await stripeUtils.setDefaultPaymentMethod(
      subscription.stripe_customer_id,
      paymentMethod.stripe_payment_method_id
    );

    // Update database
    const updatedMethod = await subscriptionModel.setDefaultPaymentMethod(brandId, methodId);

    res.status(200).json({
      status: 'success',
      message: 'Default payment method updated',
      data: { payment_method: updatedMethod }
    });
  } catch (error) {
    console.error('Error setting default payment method: - subscriptionController.js:546', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to set default payment method',
      error: error.message
    });
  }
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (req, res) => {
  try {
    const { brandId, methodId } = req.params;
    const userId = req.user.id;

    // Verify brand ownership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only brand owners can delete payment methods'
      });
    }

    // Get payment method
    const paymentMethod = await subscriptionModel.getPaymentMethodById(methodId);
    if (!paymentMethod || paymentMethod.brand_id !== brandId) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payment method not found'
      });
    }

    // Detach from Stripe
    await stripeUtils.detachPaymentMethod(paymentMethod.stripe_payment_method_id);

    // Delete from database
    await subscriptionModel.deletePaymentMethod(methodId);

    res.status(200).json({
      status: 'success',
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method: - subscriptionController.js:592', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
};

// ============================================
// BILLING
// ============================================

/**
 * Get billing history
 */
export const getBillingHistory = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    const billingHistory = await subscriptionModel.getBillingHistoryByBrandId(brandId, limit, offset);

    res.status(200).json({
      status: 'success',
      results: billingHistory.length,
      data: { billing_history: billingHistory }
    });
  } catch (error) {
    console.error('Error getting billing history: - subscriptionController.js:632', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve billing history',
      error: error.message
    });
  }
};

/**
 * Get upcoming invoice
 */
export const getUpcomingInvoice = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    // Verify brand membership
    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have access to this brand'
      });
    }

    // Get subscription
    const subscription = await subscriptionModel.getSubscriptionByBrandId(brandId);
    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active subscription found'
      });
    }

    // Get upcoming invoice from Stripe
    const upcomingInvoice = await stripeUtils.getUpcomingInvoice(
      subscription.stripe_customer_id,
      subscription.stripe_subscription_id
    );

    res.status(200).json({
      status: 'success',
      data: { 
        invoice: {
          amount_due: upcomingInvoice.amount_due / 100,
          currency: upcomingInvoice.currency,
          period_start: new Date(upcomingInvoice.period_start * 1000),
          period_end: new Date(upcomingInvoice.period_end * 1000),
          next_payment_attempt: upcomingInvoice.next_payment_attempt 
            ? new Date(upcomingInvoice.next_payment_attempt * 1000)
            : null
        }
      }
    });
  } catch (error) {
    console.error('Error getting upcoming invoice: - subscriptionController.js:688', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve upcoming invoice',
      error: error.message
    });
  }
};
