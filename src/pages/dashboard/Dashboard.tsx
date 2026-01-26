import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/layouts/DashboardLayout";

// Welcome Banner with gradient and animated elements
function WelcomeBanner() {
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-accent p-8 text-white">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="currentColor" />
                        </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid)" />
                </svg>
            </div>

            {/* Floating shapes */}
            <div className="absolute top-4 right-8 w-20 h-20 rounded-full bg-white/10 blur-xl animate-pulse"></div>
            <div className="absolute bottom-4 right-24 w-12 h-12 rounded-full bg-white/5 blur-lg animate-pulse"></div>

            <div className="relative z-10">
                <p className="text-white/80 text-sm font-medium mb-1">
                    {greeting} 👋
                </p>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Welcome to your Dashboard
                </h1>
                <p className="text-white/70 max-w-lg">
                    Here's what's happening with your business today. You're on track to hit your monthly goals!
                </p>
            </div>

            {/* Quick Actions */}
            <div className="relative z-10 flex flex-wrap gap-3 mt-6">
                <Link to="/dashboard/team">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Invite Team
                    </Button>
                </Link>
                <Link to="/dashboard/support">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Get Help
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// Stats Card with animated progress
function StatsCard({
    title,
    value,
    change,
    changeType,
    icon,
    progress,
    progressLabel,
}: {
    title: string;
    value: string;
    change: string;
    changeType: "positive" | "negative" | "neutral";
    icon: React.ReactNode;
    progress?: number;
    progressLabel?: string;
}) {
    return (
        <Card className="p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    {icon}
                </div>
                <span
                    className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                        changeType === "positive" && "bg-emerald-500/15 text-emerald-600",
                        changeType === "negative" && "bg-rose-500/15 text-rose-600",
                        changeType === "neutral" && "bg-slate-500/15 text-slate-600"
                    )}
                >
                    {changeType === "positive" && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    )}
                    {changeType === "negative" && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    )}
                    {change}
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>

            {progress !== undefined && (
                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{progressLabel}</span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}

// Activity Chart with animated bars
function ActivityChart() {
    const [period, setPeriod] = useState<"week" | "month" | "year">("week");

    const data = {
        week: [40, 65, 45, 75, 55, 80, 70],
        month: [55, 70, 60, 85, 65, 90, 75, 80, 95, 70, 85, 90],
        year: [65, 75, 70, 80, 85, 90, 88, 92, 95, 88, 80, 85],
    };

    const labels = {
        week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        month: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
        year: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Activity Overview</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Track your usage and engagement</p>
                    </div>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        {(["week", "month", "year"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                    period === p
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-64 flex items-end justify-between gap-2">
                    {data[period].map((height, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-500/50 via-violet-500/70 to-violet-500 rounded-t-lg relative group cursor-pointer hover:from-blue-500/70 hover:via-violet-500/90 hover:to-violet-600 transition-all duration-300"
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs font-bold bg-foreground text-background px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap">
                                {height} units
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                    {labels[period].map((label, i) => (
                        <span key={i} className="flex-1 text-center">{label}</span>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Quick Actions Grid
function QuickActions() {
    const actions = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
            label: "Create New",
            description: "Start a new project",
            href: "#",
            color: "bg-gradient-to-br from-blue-500 to-blue-600",
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            ),
            label: "Upload",
            description: "Import your data",
            href: "#",
            color: "bg-gradient-to-br from-emerald-500 to-teal-600",
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            label: "Analytics",
            description: "View detailed reports",
            href: "#",
            color: "bg-gradient-to-br from-violet-500 to-purple-600",
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            label: "Settings",
            description: "Configure your app",
            href: "/dashboard/settings",
            color: "bg-gradient-to-br from-amber-500 to-orange-600",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {actions.map((action) => (
                        <Link
                            key={action.label}
                            to={action.href}
                            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                        >
                            <div className={cn("p-2 rounded-lg text-white", action.color)}>
                                {action.icon}
                            </div>
                            <div>
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                    {action.label}
                                </p>
                                <p className="text-xs text-muted-foreground">{action.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Welcome Banner */}
                <WelcomeBanner />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Revenue"
                        value="$12,450"
                        change="+12.5%"
                        changeType="positive"
                        progress={75}
                        progressLabel="Monthly goal"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Active Users"
                        value="1,247"
                        change="+8.2%"
                        changeType="positive"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Conversion Rate"
                        value="24.5%"
                        change="+2.1%"
                        changeType="positive"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Active Projects"
                        value="42"
                        change="+3 new"
                        changeType="positive"
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        }
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Chart - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        <ActivityChart />
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <QuickActions />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
