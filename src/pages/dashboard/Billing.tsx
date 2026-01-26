import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Check, CreditCard, Users, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Subscription = {
    plan: string;
    status: string;
    stripe_price_id: string | null;
    current_period_end: string | null;
    stripe_customer_id: string | null;
};

type PlanDetails = {
    id?: number;
    name: string;
    slug: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    stripe_price_id_monthly: string | null;
    stripe_price_id_yearly: string | null;
    features: string[];
    limit_members: number | null;
    limit_projects: number | null;
    limit_api_requests: number | null;
    is_popular: boolean;
};

type PlanInterval = "month" | "year";

export default function BillingPage() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [currentPlan, setCurrentPlan] = useState<PlanDetails | null>(null);
    const [allPlans, setAllPlans] = useState<PlanDetails[]>([]);
    const [memberCount, setMemberCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [interval, setInterval] = useState<PlanInterval>("month");
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadBillingData();
        }
    }, [user]);

    async function loadBillingData() {
        if (!user) return;

        try {
            // Get user's profile to get brand_id
            // Note: Using 'as any' because Supabase types may not be fully up to date
            const { data: profileData } = await (supabase
                .from("profiles") as any)
                .select("current_brand_id")
                .eq("id", user.id)
                .single();

            const brandId = profileData?.current_brand_id;

            // Get subscription
            let sub: Subscription | null = null;
            if (brandId) {
                const { data: subData } = await supabase
                    .from("subscriptions")
                    .select("plan, status, stripe_price_id, current_period_end, stripe_customer_id")
                    .eq("brand_id", brandId)
                    .single();
                sub = subData as Subscription | null;
            }

            const planSlug = sub?.plan || "free";
            setSubscription(sub || {
                plan: "free",
                status: "active",
                stripe_price_id: null,
                current_period_end: null,
                stripe_customer_id: null
            });

            // Get all plans from DB
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: plans } = await (supabase as any)
                .from("payment_plans")
                .select("id, name, slug, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, features, limit_members, limit_projects, limit_api_requests, is_popular")
                .eq("is_active", true)
                .order("price_monthly", { ascending: true });

            if (plans) {
                setAllPlans(plans as PlanDetails[]);
                const current = (plans as PlanDetails[]).find(p => p.slug === planSlug);
                if (current) setCurrentPlan(current);
            }

            // Get member count
            if (brandId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { count } = await (supabase as any)
                    .from("brand_members")
                    .select("*", { count: "exact", head: true })
                    .eq("brand_id", brandId)
                    .not("joined_at", "is", null);

                setMemberCount(count || 1);
            } else {
                setMemberCount(1);
            }
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleManageBilling() {
        if (!user) return;
        setIsRedirecting(true);

        try {
            const { data, error } = await supabase.functions.invoke("stripe-portal", {
                body: {
                    returnUrl: `${window.location.origin}/dashboard/billing`,
                },
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                setIsRedirecting(false);
            }
        } catch (error) {
            console.error("Portal error:", error);
            setIsRedirecting(false);
        }
    }

    async function handleCheckout(planSlug: string) {
        if (!user) return;
        setCheckoutLoading(planSlug);

        try {
            const plan = allPlans.find(p => p.slug === planSlug);
            if (!plan) throw new Error("Plan not found");

            const priceId = interval === "month"
                ? plan.stripe_price_id_monthly
                : plan.stripe_price_id_yearly;

            if (!priceId) throw new Error("No price ID configured for this plan");

            const { data, error } = await supabase.functions.invoke("create-checkout", {
                body: {
                    priceId,
                    successUrl: `${window.location.origin}/dashboard?checkout=success`,
                    cancelUrl: `${window.location.origin}/dashboard/billing?checkout=canceled`,
                },
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                console.error("Checkout error:", data?.error);
                setCheckoutLoading(null);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            setCheckoutLoading(null);
        }
    }

    const formatLimit = (limit: number | null) => limit === null ? "Unlimited" : limit.toLocaleString();
    const isFree = (currentPlan?.price_monthly || 0) === 0;
    const upgradePlans = allPlans.filter(p => p.price_monthly > 0);

    // Determine if subscription is monthly or yearly by checking stripe_price_id
    const isYearly = subscription?.stripe_price_id &&
        (subscription.stripe_price_id === currentPlan?.stripe_price_id_yearly);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold">Billing</h1>
                    <p className="text-muted-foreground">
                        Manage your subscription and billing details
                    </p>
                </div>

                {/* Current Plan Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Plan Icon */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                                    currentPlan?.slug === "pro"
                                        ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                                        : currentPlan?.slug === "starter"
                                            ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                                )}>
                                    {currentPlan?.name?.charAt(0) || "F"}
                                </div>
                                <div>
                                    <CardTitle className="text-xl">{currentPlan?.name || "Free"} Plan</CardTitle>
                                    <CardDescription>{currentPlan?.description}</CardDescription>
                                </div>
                            </div>
                            <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                                {subscription?.status || "Active"}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Pricing */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">
                                {currentPlan?.price_monthly === 0
                                    ? "Free"
                                    : isYearly
                                        ? `$${(currentPlan?.price_yearly || 0) / 100}`
                                        : `$${(currentPlan?.price_monthly || 0) / 100}`
                                }
                            </span>
                            {!isFree && (
                                <span className="text-muted-foreground">
                                    /{isYearly ? "year" : "month"}
                                </span>
                            )}
                        </div>

                        {/* Renewal Info */}
                        {subscription?.current_period_end && (
                            <p className="text-sm text-muted-foreground">
                                Your subscription renews on {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                })}
                            </p>
                        )}

                        {/* Plan Limits */}
                        <div className="py-4 border-y border-border">
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {memberCount} / {formatLimit(currentPlan?.limit_members ?? null)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Team Members</p>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        {currentPlan?.features && currentPlan.features.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-3">What's included:</p>
                                <ul className="grid sm:grid-cols-2 gap-2">
                                    {currentPlan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4">
                            {!isFree && (
                                <Button
                                    onClick={handleManageBilling}
                                    disabled={isRedirecting}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    {isRedirecting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    Manage Billing
                                </Button>
                            )}

                            {isFree && upgradePlans.length > 0 && (
                                <Button
                                    onClick={() => setShowUpgrade(!showUpgrade)}
                                    className="gap-2"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                    {showUpgrade ? "Hide Plans" : "Upgrade Plan"}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Upgrade Section - Only for Free Users */}
                {isFree && showUpgrade && upgradePlans.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <CardTitle>Choose Your Plan</CardTitle>

                                {/* Interval Toggle */}
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        interval === "month" ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        Monthly
                                    </span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={interval === "year"}
                                        onClick={() => setInterval(interval === "month" ? "year" : "month")}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            interval === "year" ? "bg-primary" : "bg-muted"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                            interval === "year" ? "translate-x-6" : "translate-x-1"
                                        )} />
                                    </button>
                                    <span className={cn(
                                        "text-sm font-medium flex items-center gap-2",
                                        interval === "year" ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        Yearly
                                        <Badge className="text-xs bg-green-500 text-white hover:bg-green-600">
                                            Save 2 months
                                        </Badge>
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                {upgradePlans.map((plan) => {
                                    const price = interval === "month" ? plan.price_monthly : plan.price_yearly;
                                    const priceLabel = `$${price / 100}`;
                                    const periodLabel = interval === "month" ? "/month" : "/year";

                                    return (
                                        <div
                                            key={plan.slug}
                                            className={cn(
                                                "relative rounded-xl border p-6 flex flex-col",
                                                plan.is_popular
                                                    ? "border-primary bg-primary/5 shadow-lg"
                                                    : "border-border bg-background"
                                            )}
                                        >
                                            {plan.is_popular && (
                                                <div className="absolute -top-3 left-4">
                                                    <Badge className="bg-primary text-white">Most Popular</Badge>
                                                </div>
                                            )}

                                            {/* Plan Header */}
                                            <div className="mb-4">
                                                <h3 className="text-lg font-bold">{plan.name}</h3>
                                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                                            </div>

                                            {/* Price */}
                                            <div className="mb-4">
                                                <span className="text-3xl font-bold">{priceLabel}</span>
                                                <span className="text-muted-foreground">{periodLabel}</span>
                                            </div>

                                            {/* Features */}
                                            <ul className="space-y-2 mb-6 flex-1">
                                                {plan.features.slice(0, 5).map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                                {plan.limit_members && (
                                                    <li className="flex items-start gap-2 text-sm">
                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                        <span>Up to {plan.limit_members} team members</span>
                                                    </li>
                                                )}
                                            </ul>

                                            {/* CTA */}
                                            <Button
                                                onClick={() => handleCheckout(plan.slug)}
                                                disabled={checkoutLoading === plan.slug}
                                                variant={plan.is_popular ? "default" : "outline"}
                                                className="w-full"
                                            >
                                                {checkoutLoading === plan.slug ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : null}
                                                Get Started
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Help Section */}
                <div className="text-center text-sm text-muted-foreground">
                    <p>
                        Need help with billing?{" "}
                        <Link to="/dashboard/support" className="text-primary hover:underline">
                            Contact support
                        </Link>
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
