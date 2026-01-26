// Pricing plans configuration
// Now fetches dynamically from database with fallback to defaults

export type PlanInterval = "month" | "year";

export interface PricingPlan {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    trial_enabled?: boolean;
    trial_days?: number;
    features: string[];
    limits: {
        teamMembers: number | "unlimited";
    };
    popular?: boolean;
}

// Fallback plans if database is unavailable
export const defaultPricingPlans: PricingPlan[] = [
    {
        id: "free",
        name: "Free",
        description: "Perfect for getting started",
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            "1 team member",
            "Community support",
            "Basic analytics",
        ],
        limits: {
            teamMembers: 1,
        },
    },
    {
        id: "starter",
        name: "Starter",
        description: "For growing teams",
        priceMonthly: 19,
        priceYearly: 190,
        features: [
            "5 team members",
            "Email support",
            "Advanced analytics",
            "Custom domain",
        ],
        limits: {
            teamMembers: 5,
        },
        popular: true,
    },
    {
        id: "pro",
        name: "Pro",
        description: "For scaling businesses",
        priceMonthly: 49,
        priceYearly: 490,
        features: [
            "Unlimited team members",
            "Priority support",
            "Advanced analytics",
            "Custom domain",
            "API access",
            "SSO (coming soon)",
        ],
        limits: {
            teamMembers: "unlimited",
        },
    },
];

// Cache for plans to avoid repeated database calls
let cachedPlans: PricingPlan[] | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Fetch pricing plans from the API (database)
 * Falls back to defaults if API unavailable
 */
export async function getPricingPlans(): Promise<PricingPlan[]> {
    // Return cached plans if still valid
    if (cachedPlans && Date.now() < cacheExpiry) {
        return cachedPlans;
    }

    try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        // In Vite, we'll fetch from Edge Function
        const response = await fetch(`${baseUrl}/functions/v1/get-pricing-plans`);

        if (!response.ok) {
            console.warn("Failed to fetch pricing plans, using defaults");
            return defaultPricingPlans;
        }

        const plans = await response.json();
        cachedPlans = plans;
        cacheExpiry = Date.now() + CACHE_TTL;
        return plans;
    } catch (error) {
        console.warn("Error fetching pricing plans:", error);
        return defaultPricingPlans;
    }
}

/**
 * Get a single plan by ID (slug)
 */
export async function getPlanById(id: string): Promise<PricingPlan | undefined> {
    const plans = await getPricingPlans();
    return plans.find((plan) => plan.id === id);
}

/**
 * Get a plan by Stripe price ID
 */
export async function getPlanByStripePriceId(priceId: string): Promise<PricingPlan | undefined> {
    const plans = await getPricingPlans();
    return plans.find(
        (plan) =>
            plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId
    );
}

/**
 * Helper to format price
 */
export function formatPrice(price: number, interval: PlanInterval): string {
    if (price === 0) return "Free";
    return `$${price}/${interval === "month" ? "mo" : "yr"}`;
}

// For backwards compatibility - synchronous access to defaults
// Use getPricingPlans() for dynamic plans
export const pricingPlans = defaultPricingPlans;
