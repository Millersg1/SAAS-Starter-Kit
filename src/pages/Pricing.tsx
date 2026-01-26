import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Badge } from "@/components/ui";
import { type PlanInterval, type PricingPlan, pricingPlans as defaultPlans } from "@/config/pricing";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

function PricingToggle({
    interval,
    onChange,
}: {
    interval: PlanInterval;
    onChange: (interval: PlanInterval) => void;
}) {
    return (
        <div className="flex items-center justify-center gap-4 mb-12">
            <span
                className={cn(
                    "text-sm font-medium",
                    interval === "month" ? "text-foreground" : "text-muted-foreground"
                )}
            >
                Monthly
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={interval === "year"}
                onClick={() => onChange(interval === "month" ? "year" : "month")}
                className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    interval === "year" ? "bg-primary" : "bg-muted"
                )}
            >
                <span
                    className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        interval === "year" ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>
            <span
                className={cn(
                    "text-sm font-medium flex items-center gap-2",
                    interval === "year" ? "text-foreground" : "text-muted-foreground"
                )}
            >
                Yearly
                <Badge className="bg-accent text-white">Save 2 months</Badge>
            </span>
        </div>
    );
}

function PricingCard({
    plan,
    interval,
}: {
    plan: PricingPlan;
    interval: PlanInterval;
}) {
    const price = interval === "month" ? plan.priceMonthly : plan.priceYearly;
    const priceLabel = price === 0 ? "Free" : `$${price}`;
    const periodLabel = price === 0 ? "" : interval === "month" ? "/month" : "/year";

    return (
        <div
            className={cn(
                "relative rounded-2xl border p-8 flex flex-col",
                plan.popular
                    ? "border-primary bg-primary/5 shadow-lg scale-105"
                    : "border-border bg-background"
            )}
        >
            {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white">Most Popular</Badge>
                </div>
            )}

            {/* Plan Name */}
            <div className="mb-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
                <span className="text-4xl font-bold">{priceLabel}</span>
                <span className="text-muted-foreground">{periodLabel}</span>
            </div>

            {/* CTA */}
            <Link to={price === 0 ? "/signup" : `/signup?plan=${plan.id}&interval=${interval}`}>
                <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "primary" : "outline"}
                    size="lg"
                >
                    {price === 0
                        ? "Get Started"
                        : plan.trial_enabled && plan.trial_days
                            ? `Start ${plan.trial_days}-Day Free Trial`
                            : "Get Started"
                    }
                </Button>
            </Link>

            {/* Features */}
            <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                        <svg
                            className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function PricingPage() {
    const [interval, setInterval] = useState<PlanInterval>("month");
    const [plans, setPlans] = useState<PricingPlan[]>(defaultPlans);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPlans() {
            try {
                const { data, error } = await (supabase as any)
                    .from("payment_plans")
                    .select("*")
                    .eq("is_active", true)
                    .order("sort_order", { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    // Transform database plans to match PricingPlan interface
                    const transformedPlans: PricingPlan[] = data.map((plan: any) => ({
                        id: plan.slug,
                        name: plan.name,
                        description: plan.description || "",
                        priceMonthly: plan.price_monthly / 100,
                        priceYearly: plan.price_yearly / 100,
                        stripePriceIdMonthly: plan.stripe_price_id_monthly,
                        stripePriceIdYearly: plan.stripe_price_id_yearly,
                        trial_enabled: plan.trial_enabled,
                        trial_days: plan.trial_days,
                        features: plan.features || [],
                        limits: {
                            teamMembers: plan.limit_members ?? "unlimited",
                        },
                        popular: plan.is_popular,
                    }));
                    setPlans(transformedPlans);
                }
            } catch (error) {
                console.warn("Failed to fetch plans from database, using defaults:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchPlans();
    }, []);

    return (
        <div className="py-20">
            <div className="container-xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Start free, upgrade when you're ready. No hidden fees, no surprises.
                    </p>
                </div>

                {/* Toggle */}
                <PricingToggle interval={interval} onChange={setInterval} />

                {/* Plans */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {loading ? (
                        // Loading skeleton
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-border p-8 animate-pulse">
                                <div className="h-6 bg-muted rounded mb-4 w-24" />
                                <div className="h-4 bg-muted rounded mb-6 w-32" />
                                <div className="h-10 bg-muted rounded mb-6" />
                                <div className="h-10 bg-muted rounded mb-6" />
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="h-4 bg-muted rounded w-full" />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        plans.map((plan) => (
                            <PricingCard key={plan.id} plan={plan} interval={interval} />
                        ))
                    )}
                </div>

                {/* FAQ */}
                <div className="mt-20 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                q: "Can I cancel anytime?",
                                a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.",
                            },
                            {
                                q: "What payment methods do you accept?",
                                a: "We accept all major credit cards through Stripe. Enterprise customers can pay via invoice.",
                            },
                            {
                                q: "Is there a free trial?",
                                a: "The Free plan is free forever. Paid plans include all features from day one—no trial needed.",
                            },
                            {
                                q: "Can I switch plans later?",
                                a: "Absolutely! You can upgrade or downgrade your plan at any time through the billing portal.",
                            },
                        ].map((faq) => (
                            <div key={faq.q} className="border-b border-border pb-6">
                                <h3 className="font-semibold mb-2">{faq.q}</h3>
                                <p className="text-muted-foreground">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
