import * as brandModel from '../models/brandModel.js';
import * as stripeUtils from '../utils/stripeUtils.js';

// ============================================
// STRIPE CONNECT EXPRESS
// ============================================

/**
 * Derive a simple status string from a live Stripe Account object
 */
function deriveConnectStatus(account) {
  if (account.charges_enabled && account.payouts_enabled) return 'active';
  if (account.details_submitted) return 'pending_verification';
  if (account.requirements?.disabled_reason) return 'restricted';
  return 'onboarding_started';
}

/**
 * GET /api/connect/:brandId/status
 * Returns the Stripe Connect status for a brand.
 * Any brand member can call this.
 */
export const getConnectStatus = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member) {
      return res.status(403).json({ status: 'fail', message: 'You do not have access to this brand' });
    }

    const connectData = await brandModel.getBrandConnectStatus(brandId);
    if (!connectData) {
      return res.status(404).json({ status: 'fail', message: 'Brand not found' });
    }

    // If account exists, do a live refresh from Stripe and sync to DB if changed
    if (connectData.stripe_account_id) {
      try {
        const account = await stripeUtils.retrieveConnectAccount(connectData.stripe_account_id);
        const liveStatus = deriveConnectStatus(account);

        if (
          liveStatus !== connectData.stripe_connect_status ||
          account.payouts_enabled !== connectData.stripe_payouts_enabled ||
          account.charges_enabled !== connectData.stripe_charges_enabled
        ) {
          await brandModel.updateBrandStripeConnect(brandId, {
            stripe_connect_status: liveStatus,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_charges_enabled: account.charges_enabled,
          });
          connectData.stripe_connect_status = liveStatus;
          connectData.stripe_payouts_enabled = account.payouts_enabled;
          connectData.stripe_charges_enabled = account.charges_enabled;
        }
      } catch (stripeErr) {
        // Continue with cached DB values — do not fail the request over a Stripe API hiccup
        console.error('Could not refresh Connect account from Stripe:', stripeErr.message);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        stripe_account_id: connectData.stripe_account_id || null,
        stripe_connect_status: connectData.stripe_connect_status || 'not_connected',
        stripe_payouts_enabled: connectData.stripe_payouts_enabled || false,
        stripe_charges_enabled: connectData.stripe_charges_enabled || false,
        stripe_connect_created_at: connectData.stripe_connect_created_at || null,
      },
    });
  } catch (error) {
    console.error('Error getting Connect status: - connectController.js', error);
    res.status(500).json({ status: 'error', message: 'Failed to get Connect status', error: error.message });
  }
};

/**
 * POST /api/connect/:brandId/onboard
 * Creates (or re-uses) a Stripe Express account and returns the hosted onboarding URL.
 * Only the brand owner can call this.
 */
export const createOnboardingLink = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ status: 'fail', message: 'Only brand owners can connect Stripe' });
    }

    const brand = await brandModel.getBrandById(brandId);
    if (!brand) {
      return res.status(404).json({ status: 'fail', message: 'Brand not found' });
    }

    let accountId = brand.stripe_account_id;

    // Create a new Express account if one doesn't exist yet
    if (!accountId) {
      const account = await stripeUtils.createConnectAccount(req.user.email, {
        brand_id: brandId,
        brand_name: brand.name,
      });
      accountId = account.id;

      await brandModel.updateBrandStripeConnect(brandId, {
        stripe_account_id: accountId,
        stripe_connect_status: 'onboarding_started',
        stripe_payouts_enabled: false,
        stripe_charges_enabled: false,
        stripe_connect_created_at: new Date(),
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const link = await stripeUtils.createAccountLink(
      accountId,
      `${frontendUrl}/brands/${brandId}?connect=refresh`,
      `${frontendUrl}/brands/${brandId}?connect=return`
    );

    res.status(200).json({ status: 'success', data: { url: link.url } });
  } catch (error) {
    console.error('Error creating onboarding link: - connectController.js', error);
    res.status(500).json({ status: 'error', message: 'Failed to create onboarding link', error: error.message });
  }
};

/**
 * GET /api/connect/:brandId/return
 * Called when the brand owner returns from Stripe hosted onboarding.
 * Fetches live account status from Stripe and persists it.
 * Only the brand owner can call this.
 */
export const handleOnboardingReturn = async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user.id;

    const member = await brandModel.getBrandMember(brandId, userId);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    const brand = await brandModel.getBrandById(brandId);
    if (!brand || !brand.stripe_account_id) {
      return res.status(404).json({ status: 'fail', message: 'No Connect account found for this brand' });
    }

    const account = await stripeUtils.retrieveConnectAccount(brand.stripe_account_id);
    const newStatus = deriveConnectStatus(account);

    await brandModel.updateBrandStripeConnect(brandId, {
      stripe_connect_status: newStatus,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_charges_enabled: account.charges_enabled,
    });

    res.status(200).json({
      status: 'success',
      data: {
        stripe_connect_status: newStatus,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_charges_enabled: account.charges_enabled,
      },
    });
  } catch (error) {
    console.error('Error handling onboarding return: - connectController.js', error);
    res.status(500).json({ status: 'error', message: 'Failed to refresh Connect status', error: error.message });
  }
};
