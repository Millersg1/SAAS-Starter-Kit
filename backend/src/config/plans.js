/**
 * Subscription plan definitions and feature limits.
 * Used by planEnforcement middleware to gate features by tier.
 */

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      brands: 1,
      clients: 50,
      projects: 10,
      invoices: 20,
      documents: 100,    // MB storage
      team_members: 1,
      workflows: 2,
      campaigns: 1,
      funnels: 1,
      email_sends_per_month: 500,
      sms_per_month: 0,
      ai_requests_per_month: 50,
      custom_fields: 5,
      lead_forms: 2,
      booking_pages: 1,
    },
    features: [
      'crm', 'invoicing', 'projects', 'tasks', 'documents',
      'calendar', 'lead_forms', 'basic_analytics',
    ],
  },
  starter: {
    name: 'Starter',
    price: 29,
    limits: {
      brands: 2,
      clients: 500,
      projects: 50,
      invoices: 200,
      documents: 1000,
      team_members: 3,
      workflows: 10,
      campaigns: 10,
      funnels: 5,
      email_sends_per_month: 5000,
      sms_per_month: 500,
      ai_requests_per_month: 500,
      custom_fields: 20,
      lead_forms: 10,
      booking_pages: 5,
    },
    features: [
      'crm', 'invoicing', 'projects', 'tasks', 'documents',
      'calendar', 'lead_forms', 'basic_analytics', 'advanced_analytics',
      'email_campaigns', 'pipeline', 'proposals', 'contracts',
      'time_tracking', 'tickets', 'chat_widget', 'booking',
      'drip_sequences', 'surveys',
    ],
  },
  professional: {
    name: 'Professional',
    price: 79,
    limits: {
      brands: 5,
      clients: 2000,
      projects: 200,
      invoices: 1000,
      documents: 5000,
      team_members: 10,
      workflows: 50,
      campaigns: 50,
      funnels: 20,
      email_sends_per_month: 25000,
      sms_per_month: 2500,
      ai_requests_per_month: 2000,
      custom_fields: 50,
      lead_forms: 50,
      booking_pages: 20,
    },
    features: [
      'crm', 'invoicing', 'projects', 'tasks', 'documents',
      'calendar', 'lead_forms', 'basic_analytics', 'advanced_analytics',
      'email_campaigns', 'pipeline', 'proposals', 'contracts',
      'time_tracking', 'tickets', 'chat_widget', 'booking',
      'drip_sequences', 'surveys', 'workflows', 'cms', 'social_media',
      'sms', 'voip', 'funnels', 'reputation', 'ai_features',
      'client_portal', 'webhooks', 'segments', 'custom_fields',
      'email_connections', 'service_packages', 'client_reports',
    ],
  },
  agency: {
    name: 'Agency',
    price: 199,
    limits: {
      brands: 25,
      clients: 10000,
      projects: 1000,
      invoices: 5000,
      documents: 25000,
      team_members: 50,
      workflows: 200,
      campaigns: 200,
      funnels: 100,
      email_sends_per_month: 100000,
      sms_per_month: 10000,
      ai_requests_per_month: 10000,
      custom_fields: 100,
      lead_forms: 200,
      booking_pages: 100,
    },
    features: [
      'crm', 'invoicing', 'projects', 'tasks', 'documents',
      'calendar', 'lead_forms', 'basic_analytics', 'advanced_analytics',
      'email_campaigns', 'pipeline', 'proposals', 'contracts',
      'time_tracking', 'tickets', 'chat_widget', 'booking',
      'drip_sequences', 'surveys', 'workflows', 'cms', 'social_media',
      'sms', 'voip', 'funnels', 'reputation', 'ai_features',
      'client_portal', 'webhooks', 'segments', 'custom_fields',
      'email_connections', 'service_packages', 'client_reports',
      'white_label', 'api_access', 'priority_support',
      'custom_domain', 'remove_branding', 'advanced_workflows',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    limits: {
      brands: -1,          // unlimited
      clients: -1,
      projects: -1,
      invoices: -1,
      documents: 100000,
      team_members: -1,
      workflows: -1,
      campaigns: -1,
      funnels: -1,
      email_sends_per_month: -1,
      sms_per_month: -1,
      ai_requests_per_month: -1,
      custom_fields: -1,
      lead_forms: -1,
      booking_pages: -1,
    },
    features: ['*'],  // all features
  },
};

// Map route prefixes to feature flags
export const ROUTE_FEATURE_MAP = {
  '/api/workflows': 'workflows',
  '/api/cms': 'cms',
  '/api/social': 'social_media',
  '/api/sms': 'sms',
  '/api/voip': 'voip',
  '/api/funnels': 'funnels',
  '/api/reputation': 'reputation',
  '/api/ai': 'ai_features',
  '/api/webhooks/endpoints': 'webhooks',
  '/api/segments': 'segments',
  '/api/drip': 'drip_sequences',
  '/api/chat-widget': 'chat_widget',
  '/api/email-connections': 'email_connections',
  '/api/packages': 'service_packages',
  '/api/client-reports': 'client_reports',
  '/api/surveys': 'surveys',
};

// Map entity types to limit keys for counting
export const ENTITY_LIMIT_MAP = {
  clients: 'clients',
  projects: 'projects',
  invoices: 'invoices',
  brands: 'brands',
  workflows: 'workflows',
  campaigns: 'campaigns',
  funnels: 'funnels',
  lead_forms: 'lead_forms',
  booking_pages: 'booking_pages',
  custom_fields: 'custom_fields',
};

/**
 * Get plan config by plan name (case-insensitive, defaults to free)
 */
export const getPlanConfig = (planName) => {
  const key = (planName || 'free').toLowerCase().replace(/\s+/g, '_');
  return PLANS[key] || PLANS.free;
};

/**
 * Check if a plan has access to a specific feature
 */
export const planHasFeature = (planName, feature) => {
  const plan = getPlanConfig(planName);
  return plan.features.includes('*') || plan.features.includes(feature);
};

/**
 * Get the limit for a specific resource on a plan (-1 = unlimited)
 */
export const getPlanLimit = (planName, resource) => {
  const plan = getPlanConfig(planName);
  return plan.limits[resource] ?? 0;
};
