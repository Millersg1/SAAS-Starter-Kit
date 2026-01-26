import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { PieChart } from "@/components/charts/PieChart";
import { LineChart } from "@/components/charts/LineChart";
import { supabase } from "@/integrations/supabase/client";

// Types
interface Stats {
    totalUsers: number;
    newUsersToday: number;
    activeSubscriptions: number;
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
    trialConversionRate: number;
    churned: {
        thisMonth: number;
        revenue: number;
    };
    trends: {
        userGrowth: number;
    };
}

interface Signup {
    id: string;
    full_name: string | null;
    email: string;
    plan: string;
    created_at: string;
}

interface PlanDistribution {
    label: string;
    value: number;
}

interface GrowthData {
    month: string;
    users: number;
    newUsers: number;
}

type Timeframe = "7d" | "30d" | "3m" | "6m" | "12m" | "all";

const timeframeOptions: { value: Timeframe; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "3m", label: "3 Months" },
    { value: "6m", label: "6 Months" },
    { value: "12m", label: "12 Months" },
    { value: "all", label: "All Time" },
];

// Skeleton Components
function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 w-24 bg-slate-200 rounded"></div>
                        <div className="h-8 w-20 bg-slate-200 rounded"></div>
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="animate-pulse h-6 w-32 bg-slate-200 rounded"></div>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-end gap-2">
                    {[45, 72, 38, 85, 55, 68, 42, 78, 52, 65, 48, 75].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-slate-200 rounded-t animate-pulse" style={{ height: `${h}%` }} />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Stats Card Component
function StatsCard({ title, value, subtitle, trend, color }: {
    title: string;
    value: string;
    subtitle: string;
    trend?: { value: number; positive: boolean };
    color?: "blue" | "green" | "orange" | "red";
}) {
    const colorClasses = {
        blue: "text-blue-600",
        green: "text-green-600",
        orange: "text-orange-600",
        red: "text-red-600",
    };

    return (
        <Card className="p-6 hover:shadow-md transition-shadow">
            <p className={`text-sm font-medium ${color ? colorClasses[color] : "text-slate-500"}`}>{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-slate-500">{subtitle}</p>
                {trend && trend.value !== 0 && (
                    <p className={`text-sm font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}>
                        {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
                    </p>
                )}
            </div>
        </Card>
    );
}

// User Growth Chart Component
function UserGrowthChart({ data, timeframe, onTimeframeChange }: {
    data: GrowthData[];
    timeframe: Timeframe;
    onTimeframeChange: (tf: Timeframe) => void;
}) {
    const maxUsers = Math.max(...data.map(d => d.users), 1);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>User Growth</CardTitle>
                    <select
                        value={timeframe}
                        onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
                        className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        {timeframeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-64 flex items-end gap-1">
                    {data.map((point, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                style={{ height: `${(point.users / maxUsers) * 100}%`, minHeight: "4px" }}
                                title={`${point.month}: ${point.users} users (+${point.newUsers})`}
                            />
                            <span className="text-[10px] text-slate-500">{point.month}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Recent Signups Component
function RecentSignups({ signups }: { signups: Signup[] }) {
    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        return d.toLocaleDateString();
    };

    const planColors: Record<string, string> = {
        free: "bg-slate-100 text-slate-700",
        starter: "bg-blue-100 text-blue-700",
        pro: "bg-purple-100 text-purple-700",
        enterprise: "bg-amber-100 text-amber-700",
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Recent Signups</CardTitle>
                    <Link to="/admin/users" className="text-sm text-blue-600 hover:underline">
                        View all →
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {signups.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No signups yet</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="pb-2 font-medium">User</th>
                                <th className="pb-2 font-medium">Plan</th>
                                <th className="pb-2 font-medium text-right">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {signups.map((user) => (
                                <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="py-3">
                                        <p className="font-medium">{user.full_name || "No name"}</p>
                                        <p className="text-slate-500 text-xs">{user.email}</p>
                                    </td>
                                    <td className="py-3">
                                        <Badge className={planColors[user.plan] || planColors.free}>
                                            {user.plan}
                                        </Badge>
                                    </td>
                                    <td className="py-3 text-slate-500">{formatDate(user.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </CardContent>
        </Card>
    );
}

// Main Dashboard Component
export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [signups, setSignups] = useState<Signup[]>([]);
    const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [mrrTrend, setMrrTrend] = useState<{ label: string; value: number }[]>([]);
    const [churnTrend, setChurnTrend] = useState<{ label: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>("12m");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Refetch growth data when timeframe changes
    useEffect(() => {
        if (!loading) {
            fetchGrowthData(timeframe);
        }
    }, [timeframe]);

    async function fetchDashboardData() {
        try {
            // Fetch all data in parallel using direct Supabase queries
            const [statsData, signupsData, , mrrData, churnData] = await Promise.all([
                fetchStats(),
                fetchSignups(),
                fetchGrowthData(timeframe),
                fetchMrrTrend(),
                fetchChurnTrend(),
            ]);

            if (statsData) setStats(statsData);
            if (signupsData) {
                setSignups(signupsData.recentSignups);
                setPlanDistribution(signupsData.planDistribution);
            }
            if (mrrData) setMrrTrend(mrrData);
            if (churnData) setChurnTrend(churnData);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }

    // ============================================================================
    // fetch Stats - Direct Supabase Queries
    // ============================================================================
    async function fetchStats(): Promise<Stats | null> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const lastMonthStart = new Date();
            lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
            lastMonthStart.setDate(1);
            lastMonthStart.setHours(0, 0, 0, 0);

            // Total users (excluding admins)
            const { count: totalUsers } = await (supabase as any)
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .neq("role", "admin");

            // New users today
            const { count: newUsersToday } = await (supabase as any)
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .neq("role", "admin")
                .gte("created_at", today.toISOString());

            // Active subscriptions (non-free)
            const { count: activeSubscriptions } = await (supabase as any)
                .from("subscriptions")
                .select("*", { count: "exact", head: true })
                .eq("status", "active")
                .neq("plan", "free");

            // Get subscription data with prices for MRR calculation
            const { data: subsWithPrice } = await (supabase as any)
                .from("subscriptions")
                .select(`plan, payment_plans!inner(price_monthly)`)
                .eq("status", "active")
                .neq("plan", "free");

            let mrr = 0;
            if (subsWithPrice) {
                mrr = subsWithPrice.reduce((sum: number, sub: any) => {
                    const plan = Array.isArray(sub.payment_plans) ? sub.payment_plans[0] : sub.payment_plans;
                    return sum + (plan?.price_monthly || 0);
                }, 0) / 100;
            }

            // New users this month vs last month for trend
            const { count: newUsersThisMonth } = await (supabase as any)
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .neq("role", "admin")
                .gte("created_at", monthStart.toISOString());

            const { count: usersLastMonth } = await (supabase as any)
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .neq("role", "admin")
                .gte("created_at", lastMonthStart.toISOString())
                .lt("created_at", monthStart.toISOString());

            const userGrowth = usersLastMonth && usersLastMonth > 0
                ? Math.round(((newUsersThisMonth || 0) - usersLastMonth) / usersLastMonth * 100)
                : 0;

            // Churn this month
            const { count: churnedThisMonth } = await (supabase as any)
                .from("subscriptions")
                .select("*", { count: "exact", head: true })
                .neq("plan", "free")
                .gte("cancelled_at", monthStart.toISOString());

            return {
                totalUsers: totalUsers || 0,
                newUsersToday: newUsersToday || 0,
                activeSubscriptions: activeSubscriptions || 0,
                mrr,
                arr: mrr * 12,
                arpu: activeSubscriptions && activeSubscriptions > 0 ? mrr / activeSubscriptions : 0,
                churnRate: 0, // Simplified for now
                trialConversionRate: 0, // Simplified for now
                churned: {
                    thisMonth: churnedThisMonth || 0,
                    revenue: 0,
                },
                trends: {
                    userGrowth,
                },
            };
        } catch (error) {
            console.error("Error fetching stats:", error);
            return null;
        }
    }

    // ============================================================================
    // fetch Signups - Direct Supabase Queries
    // ============================================================================
    async function fetchSignups() {
        try {
            // Get total users count (excluding admins)
            const { count: totalUsers } = await (supabase as any)
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .neq("role", "admin");

            // Recent signups - get user profiles with their subscription info
            const { data: recentProfiles } = await (supabase as any)
                .from("profiles")
                .select("id, full_name, email, created_at, current_brand_id")
                .neq("role", "admin")
                .order("created_at", { ascending: false })
                .limit(5);

            // Get subscription data for these users' brands
            const brandIds = (recentProfiles || [])
                .map((p: any) => p.current_brand_id)
                .filter(Boolean);

            let subscriptionsByBrand: Record<string, string> = {};
            if (brandIds.length > 0) {
                const { data: subs } = await (supabase as any)
                    .from("subscriptions")
                    .select("brand_id, plan")
                    .in("brand_id", brandIds);

                if (subs) {
                    subs.forEach((s: any) => {
                        subscriptionsByBrand[s.brand_id] = s.plan;
                    });
                }
            }

            const signups = (recentProfiles || []).map((user: any) => {
                const plan = subscriptionsByBrand[user.current_brand_id] || "free";
                return {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    plan,
                    created_at: user.created_at,
                };
            });

            // Plan distribution - count from subscriptions table
            const { data: subscriptions } = await (supabase as any)
                .from("subscriptions")
                .select("plan");

            const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0 };
            if (subscriptions) {
                subscriptions.forEach((sub: any) => {
                    const plan = sub.plan || "free";
                    planCounts[plan] = (planCounts[plan] || 0) + 1;
                });
            }

            // Calculate free users: total users minus users with subscriptions
            const usersWithSubscriptions = Object.values(planCounts).reduce((a, b) => a + b, 0);
            const freeUsers = Math.max(0, (totalUsers || 0) - usersWithSubscriptions + planCounts.free);
            planCounts.free = freeUsers;

            const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
                label: plan.charAt(0).toUpperCase() + plan.slice(1),
                value: count,
            }));

            return { recentSignups: signups, planDistribution };
        } catch (error) {
            console.error("Error fetching signups:", error);
            return { recentSignups: [], planDistribution: [] };
        }
    }

    // ============================================================================
    // fetch Growth Data - Direct Supabase Queries
    // ============================================================================
    async function fetchGrowthData(tf: Timeframe) {
        try {
            const now = new Date();
            let months = 12;

            switch (tf) {
                case "7d": months = 1; break;
                case "30d": months = 1; break;
                case "3m": months = 3; break;
                case "6m": months = 6; break;
                case "12m": months = 12; break;
                case "all": months = 24; break;
            }

            // Get all profiles for the period
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            const { data: profiles } = await (supabase as any)
                .from("profiles")
                .select("created_at")
                .neq("role", "admin")
                .order("created_at", { ascending: true });

            // Build monthly data
            const monthlyData: GrowthData[] = [];

            for (let i = months - 1; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
                const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" });

                // Count users created this month
                const newUsers = (profiles || []).filter((p: any) => {
                    const createdAt = new Date(p.created_at);
                    return createdAt >= monthDate && createdAt <= monthEnd;
                }).length;

                // Count total users up to this month
                const totalUsers = (profiles || []).filter((p: any) => {
                    const createdAt = new Date(p.created_at);
                    return createdAt <= monthEnd;
                }).length;

                monthlyData.push({
                    month: monthLabel,
                    users: totalUsers,
                    newUsers,
                });
            }

            setGrowth(monthlyData);
            return monthlyData;
        } catch (error) {
            console.error("Error fetching growth data:", error);
            return [];
        }
    }

    // ============================================================================
    // fetch MRR Trend - 12-month history
    // ============================================================================
    async function fetchMrrTrend(): Promise<{ label: string; value: number }[]> {
        try {
            const now = new Date();
            const monthsData: { label: string; value: number }[] = [];

            // Get all subscriptions with prices
            const { data: allSubs } = await (supabase as any)
                .from("subscriptions")
                .select(`created_at, cancelled_at, plan, payment_plans!inner(price_monthly)`)
                .neq("plan", "free")
                .order("created_at", { ascending: true });

            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
                const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" });

                let monthlyMRR = 0;

                if (allSubs) {
                    allSubs.forEach((sub: any) => {
                        const createdAt = new Date(sub.created_at);
                        const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
                        const wasActiveThisMonth = createdAt <= monthEnd && (!cancelledAt || cancelledAt >= monthDate);

                        if (wasActiveThisMonth) {
                            const plan = Array.isArray(sub.payment_plans) ? sub.payment_plans[0] : sub.payment_plans;
                            monthlyMRR += (plan?.price_monthly || 0);
                        }
                    });
                }

                monthsData.push({
                    label: monthLabel,
                    value: monthlyMRR / 100,
                });
            }

            return monthsData;
        } catch (error) {
            console.error("Error fetching MRR trend:", error);
            return [];
        }
    }

    // ============================================================================
    // fetch Churn Trend - 12-month history
    // ============================================================================
    async function fetchChurnTrend(): Promise<{ label: string; value: number }[]> {
        try {
            const now = new Date();
            const monthsData: { label: string; value: number }[] = [];

            // Get all subscriptions
            const { data: allSubs } = await (supabase as any)
                .from("subscriptions")
                .select("created_at, cancelled_at, plan")
                .neq("plan", "free")
                .order("created_at", { ascending: true });

            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
                const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" });

                let activeAtStart = 0;
                let cancelledThisMonth = 0;

                if (allSubs) {
                    allSubs.forEach((sub: any) => {
                        const createdAt = new Date(sub.created_at);
                        const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;

                        // Was active at start of month
                        if (createdAt < monthDate && (!cancelledAt || cancelledAt >= monthDate)) {
                            activeAtStart++;
                        }

                        // Cancelled during this month
                        if (cancelledAt && cancelledAt >= monthDate && cancelledAt <= monthEnd) {
                            cancelledThisMonth++;
                        }
                    });
                }

                const churnRate = activeAtStart > 0
                    ? Math.round((cancelledThisMonth / activeAtStart) * 100 * 10) / 10
                    : 0;

                monthsData.push({
                    label: monthLabel,
                    value: churnRate,
                });
            }

            return monthsData;
        } catch (error) {
            console.error("Error fetching churn trend:", error);
            return [];
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Analytics Overview</h1>
                    <p className="text-slate-500">Monitor your SaaS metrics and growth</p>
                </div>
                <StatsSkeleton />
                <ChartSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Analytics Overview</h1>
                <p className="text-slate-500">Monitor your SaaS metrics and growth</p>
            </div>

            {/* Stats Grid - 8 cards like SSK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Users"
                    value={stats?.totalUsers?.toLocaleString() || "0"}
                    subtitle={`+${stats?.newUsersToday || 0} today`}
                    trend={stats?.trends?.userGrowth ? { value: stats.trends.userGrowth, positive: stats.trends.userGrowth > 0 } : undefined}
                    color="blue"
                />
                <StatsCard
                    title="Active Subscriptions"
                    value={stats?.activeSubscriptions?.toLocaleString() || "0"}
                    subtitle="Paid users"
                    color="green"
                />
                <StatsCard
                    title="Monthly Recurring Revenue"
                    value={`$${(stats?.mrr || 0).toLocaleString()}`}
                    subtitle="MRR"
                    color="orange"
                />
                <StatsCard
                    title="New Users Today"
                    value={stats?.newUsersToday?.toString() || "0"}
                    subtitle="Signups"
                    color="blue"
                />
                <StatsCard
                    title="Annual Recurring Revenue"
                    value={`$${(stats?.arr || 0).toLocaleString()}`}
                    subtitle="ARR"
                    color="orange"
                />
                <StatsCard
                    title="Average Revenue Per User"
                    value={`$${(stats?.arpu || 0).toFixed(2)}`}
                    subtitle="ARPU"
                    color="green"
                />
                <StatsCard
                    title="Churn Rate"
                    value={`${stats?.churnRate || 0}%`}
                    subtitle={`${stats?.churned?.thisMonth || 0} cancelled this month`}
                    trend={stats?.churnRate ? { value: stats.churnRate, positive: false } : undefined}
                    color="red"
                />
                <StatsCard
                    title="Trial Conversion"
                    value={`${stats?.trialConversionRate || 0}%`}
                    subtitle="Trial to paid"
                    trend={stats?.trialConversionRate ? { value: stats.trialConversionRate, positive: true } : undefined}
                    color="green"
                />
            </div>

            {/* Charts Row - Growth + Plan Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <UserGrowthChart
                        data={growth}
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                    />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Users by Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {planDistribution.length > 0 ? (
                            <PieChart data={planDistribution} />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                No subscription data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Trend Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>MRR Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {mrrTrend.length > 0 ? (
                            <LineChart
                                data={mrrTrend}
                                formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
                                color="#3B82F6"
                                height={280}
                            />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-500">
                                No MRR data
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Churn Rate Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {churnTrend.length > 0 ? (
                            <LineChart
                                data={churnTrend}
                                formatValue={(v) => `${v.toFixed(1)}%`}
                                color="#3B82F6"
                                height={280}
                            />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-500">
                                No churn data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Signups */}
            <RecentSignups signups={signups} />
        </div>
    );
}
