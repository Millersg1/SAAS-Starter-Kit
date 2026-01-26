// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Timeframe = "7d" | "30d" | "3m" | "6m" | "12m" | "all";

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const authHeader = req.headers.get("Authorization");

        // Debug logging
        console.log("Auth header present:", !!authHeader);
        console.log("Auth header prefix:", authHeader?.substring(0, 20) + "...");

        if (!authHeader) {
            console.error("No Authorization header");
            return new Response(
                JSON.stringify({ error: "No authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Client for auth check (uses user's JWT)
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Admin client for data operations (uses service role key, bypasses RLS)
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        console.log("Auth result - user:", !!user, "error:", authError?.message);

        if (authError) {
            console.error("Auth error:", authError.message);
            return new Response(
                JSON.stringify({ error: `Auth failed: ${authError.message}` }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!user) {
            console.error("No user found from token");
            return new Response(
                JSON.stringify({ error: "Unauthorized - invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user is admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response(
                JSON.stringify({ error: "Admin access required" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { action, timeframe } = await req.json();

        let result;

        switch (action) {
            case "get-stats":
                result = await getStats(adminSupabase);
                break;
            case "get-growth":
                result = await getGrowth(adminSupabase, timeframe || "12m");
                break;
            case "get-signups":
                result = await getSignups(adminSupabase);
                break;
            case "get-mrr-trend":
                result = await getMrrTrend(adminSupabase);
                break;
            case "get-churn-trend":
                result = await getChurnTrend(adminSupabase);
                break;
            default:
                return new Response(
                    JSON.stringify({ error: "Unknown action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Admin analytics error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// ============================================================================
// get-stats: Returns core SaaS metrics
// ============================================================================
// deno-lint-ignore no-explicit-any
async function getStats(supabase: any) {
    // Total users count (excluding admins)
    const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin")
        .gte("created_at", today.toISOString());

    // Active paid subscriptions
    const { count: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .neq("plan", "free");

    // Calculate MRR by joining subscriptions with payment_plans
    const { data: activeSubsWithPrice } = await supabase
        .from("subscriptions")
        .select(`plan, payment_plans!inner(price_monthly)`)
        .eq("status", "active")
        .neq("plan", "free");

    let mrr = 0;
    if (activeSubsWithPrice) {
        mrr = activeSubsWithPrice.reduce((sum: number, sub: any) => {
            const plansData = sub.payment_plans as unknown;
            const planData = Array.isArray(plansData) ? plansData[0] : plansData;
            const typedPlan = planData as { price_monthly: number } | null | undefined;
            return sum + (typedPlan?.price_monthly || 0);
        }, 0);
    }

    // Calculate trends - new users this month vs last month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin")
        .gte("created_at", monthStart.toISOString());

    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    const { count: usersLastMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin")
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", monthStart.toISOString());

    const userGrowthPercent = usersLastMonth && usersLastMonth > 0
        ? Math.round(((newUsersThisMonth || 0) - usersLastMonth) / usersLastMonth * 100)
        : 0;

    // ARR and ARPU
    const arr = mrr * 12;
    const arpu = activeSubscriptions && activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    // Churn rate
    const { count: cancelledThisMonth } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("cancelled_at", monthStart.toISOString())
        .neq("plan", "free");

    const { count: activeAtMonthStart } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .neq("plan", "free")
        .or(`cancelled_at.is.null,cancelled_at.gte.${monthStart.toISOString()}`)
        .lte("created_at", monthStart.toISOString());

    const churnRate = activeAtMonthStart && activeAtMonthStart > 0
        ? Math.round((cancelledThisMonth || 0) / activeAtMonthStart * 100 * 10) / 10
        : 0;

    // Churned revenue
    const { data: cancelledSubs } = await supabase
        .from("subscriptions")
        .select(`plan, payment_plans!inner(price_monthly)`)
        .gte("cancelled_at", monthStart.toISOString())
        .neq("plan", "free");

    let churnedRevenue = 0;
    if (cancelledSubs) {
        churnedRevenue = cancelledSubs.reduce((sum: number, sub: any) => {
            const plansData = sub.payment_plans as unknown;
            const planData = Array.isArray(plansData) ? plansData[0] : plansData;
            const typedPlan = planData as { price_monthly: number } | null | undefined;
            return sum + (typedPlan?.price_monthly || 0);
        }, 0);
    }

    // Trial conversion rate
    const { count: endedTrials } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .not("trial_ends_at", "is", null)
        .lt("trial_ends_at", new Date().toISOString());

    const { count: convertedTrials } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("converted_from_trial", true);

    const trialConversionRate = endedTrials && endedTrials > 0
        ? Math.round((convertedTrials || 0) / endedTrials * 100 * 10) / 10
        : 0;

    return {
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        activeSubscriptions: activeSubscriptions || 0,
        mrr: mrr / 100,
        arr: arr / 100,
        arpu: arpu / 100,
        churnRate,
        trialConversionRate,
        churned: {
            thisMonth: cancelledThisMonth || 0,
            revenue: churnedRevenue / 100,
        },
        trends: {
            userGrowth: userGrowthPercent,
        },
    };
}

// ============================================================================
// get-growth: Returns user growth data for specified timeframe
// ============================================================================
// deno-lint-ignore no-explicit-any
async function getGrowth(supabase: any, timeframe: Timeframe) {
    const now = new Date();
    let startDate: Date;
    let intervalType: "day" | "week" | "month";
    let intervalCount: number;
    let labelFormat: Intl.DateTimeFormatOptions;

    switch (timeframe) {
        case "7d":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "day";
            intervalCount = 7;
            labelFormat = { weekday: "short" };
            break;
        case "30d":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "week";
            intervalCount = 5;
            labelFormat = { month: "short", day: "numeric" };
            break;
        case "3m":
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 2);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "month";
            intervalCount = 3;
            labelFormat = { month: "short" };
            break;
        case "6m":
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 5);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "month";
            intervalCount = 6;
            labelFormat = { month: "short" };
            break;
        case "12m":
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 11);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "month";
            intervalCount = 12;
            labelFormat = { month: "short" };
            break;
        case "all":
            const { data: earliestProfile } = await supabase
                .from("profiles")
                .select("created_at")
                .neq("role", "admin")
                .order("created_at", { ascending: true })
                .limit(1)
                .single();

            if (earliestProfile) {
                startDate = new Date(earliestProfile.created_at);
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 11);
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            }

            const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 +
                (now.getMonth() - startDate.getMonth()) + 1;
            intervalType = "month";
            intervalCount = Math.max(monthsDiff, 1);
            labelFormat = { month: "short", year: "2-digit" };
            break;
        default:
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 11);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            intervalType = "month";
            intervalCount = 12;
            labelFormat = { month: "short" };
    }

    // Get profiles created since start date
    const { data: profiles } = await supabase
        .from("profiles")
        .select("created_at")
        .neq("role", "admin")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

    // Get total before period for cumulative
    const { count: usersBeforePeriod } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin")
        .lt("created_at", startDate.toISOString());

    // Build data points
    interface DataPoint {
        label: string;
        startMs: number;
        endMs: number;
        newUsers: number;
    }
    const dataPoints: DataPoint[] = [];

    if (intervalType === "day") {
        for (let i = 0; i < intervalCount; i++) {
            const dayStart = new Date(startDate);
            dayStart.setDate(startDate.getDate() + i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);
            dataPoints.push({
                label: dayStart.toLocaleDateString("en-US", labelFormat),
                startMs: dayStart.getTime(),
                endMs: dayEnd.getTime(),
                newUsers: 0,
            });
        }
    } else if (intervalType === "week") {
        for (let i = 0; i < intervalCount; i++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + (i * 7));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            dataPoints.push({
                label: weekStart.toLocaleDateString("en-US", labelFormat),
                startMs: weekStart.getTime(),
                endMs: weekEnd.getTime(),
                newUsers: 0,
            });
        }
    } else {
        for (let i = 0; i < intervalCount; i++) {
            const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, 0, 0, 0, 0);
            const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 1, 0, 0, 0, 0);
            dataPoints.push({
                label: monthStart.toLocaleDateString("en-US", labelFormat),
                startMs: monthStart.getTime(),
                endMs: monthEnd.getTime(),
                newUsers: 0,
            });
        }
    }

    // Count users per interval
    if (profiles) {
        for (const p of profiles) {
            const profileMs = new Date(p.created_at).getTime();
            for (const dp of dataPoints) {
                if (profileMs >= dp.startMs && profileMs < dp.endMs) {
                    dp.newUsers++;
                    break;
                }
            }
        }
    }

    // Calculate cumulative totals
    let cumulativeTotal = usersBeforePeriod || 0;
    const growth = dataPoints.map((point) => {
        cumulativeTotal += point.newUsers;
        return {
            month: point.label,
            users: cumulativeTotal,
            newUsers: point.newUsers,
        };
    });

    return { growth, timeframe };
}

// ============================================================================
// get-signups: Returns recent signups and plan distribution
// ============================================================================
// deno-lint-ignore no-explicit-any
async function getSignups(supabase: any) {
    // Get recent signups with brand/subscription info
    const { data: recentSignups } = await supabase
        .from("profiles")
        .select(`
            id,
            full_name,
            email,
            created_at,
            current_brand_id,
            brands:current_brand_id (
                name,
                subscriptions (plan)
            )
        `)
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(5);

    const signups = (recentSignups || []).map((user: any) => {
        const brandsData = user.brands as unknown;
        const brand = Array.isArray(brandsData) ? brandsData[0] : brandsData;
        const typedBrand = brand as { name: string; subscriptions: { plan: string }[] } | null | undefined;
        const plan = typedBrand?.subscriptions?.[0]?.plan || "free";
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            plan,
            created_at: user.created_at,
        };
    });

    // Get plan distribution
    const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("plan");

    const planCounts: { [key: string]: number } = { free: 0, starter: 0, pro: 0 };

    if (subscriptions) {
        subscriptions.forEach((sub: any) => {
            const plan = sub.plan || "free";
            planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
    }

    // Count users without subscriptions as free
    const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

    const subscribedCount = Object.values(planCounts).reduce((a, b) => a + b, 0);
    planCounts.free += (totalUsers || 0) - subscribedCount;

    const totalForPercentage = totalUsers || 1;
    const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count,
        percentage: Math.round((count / totalForPercentage) * 100 * 10) / 10,
    }));

    return { recentSignups: signups, planDistribution };
}

// ============================================================================
// get-mrr-trend: Returns 12-month MRR history
// ============================================================================
// deno-lint-ignore no-explicit-any
async function getMrrTrend(supabase: any) {
    const monthsData: { month: string; mrr: number }[] = [];
    const now = new Date();

    const { data: allSubs } = await supabase
        .from("subscriptions")
        .select(`created_at, cancelled_at, plan, payment_plans!inner(price_monthly)`)
        .neq("plan", "free")
        .order("created_at", { ascending: true });

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        let monthlyMRR = 0;

        if (allSubs) {
            allSubs.forEach((sub: any) => {
                const createdAt = new Date(sub.created_at);
                const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
                const wasActiveThisMonth = createdAt <= monthEnd && (!cancelledAt || cancelledAt >= monthStart);

                if (wasActiveThisMonth) {
                    const plansData = sub.payment_plans as unknown;
                    const planData = Array.isArray(plansData) ? plansData[0] : plansData;
                    const typedPlan = planData as { price_monthly: number } | null | undefined;
                    monthlyMRR += (typedPlan?.price_monthly || 0);
                }
            });
        }

        monthsData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            mrr: monthlyMRR / 100,
        });
    }

    return { trend: monthsData };
}

// ============================================================================
// get-churn-trend: Returns 12-month churn rate history
// ============================================================================
// deno-lint-ignore no-explicit-any
async function getChurnTrend(supabase: any) {
    const monthsData: { month: string; churnRate: number }[] = [];
    const now = new Date();

    const { data: allSubs } = await supabase
        .from("subscriptions")
        .select("created_at, cancelled_at, plan")
        .neq("plan", "free")
        .order("created_at", { ascending: true });

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        let activeAtStart = 0;
        let cancelledThisMonth = 0;

        if (allSubs) {
            allSubs.forEach((sub: any) => {
                const createdAt = new Date(sub.created_at);
                const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;

                if (createdAt < monthStart && (!cancelledAt || cancelledAt >= monthStart)) {
                    activeAtStart++;
                }

                if (cancelledAt && cancelledAt >= monthStart && cancelledAt <= monthEnd) {
                    cancelledThisMonth++;
                }
            });
        }

        const churnRate = activeAtStart > 0
            ? Math.round((cancelledThisMonth / activeAtStart) * 100 * 10) / 10
            : 0;

        monthsData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            churnRate,
        });
    }

    return { trend: monthsData };
}
