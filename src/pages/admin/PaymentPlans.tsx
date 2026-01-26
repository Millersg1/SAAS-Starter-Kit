import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Badge, Card, CardHeader, CardContent } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";

interface PaymentPlan {
    id: number;
    public_id: string;
    slug: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    stripe_price_id_monthly: string | null;
    stripe_price_id_yearly: string | null;
    limit_members: number | null;
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

const planColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];

export default function PaymentPlansPage() {
    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionMenu, setActionMenu] = useState<number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        try {
            // Use 'as any' to bypass TypeScript strict type checking for dynamic table access
            const { data, error } = await (supabase as any)
                .from("payment_plans")
                .select("*")
                .order("sort_order", { ascending: true });

            if (error) throw error;
            setPlans((data || []) as PaymentPlan[]);
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to load plans",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function toggleActive(plan: PaymentPlan) {
        try {
            // Use 'as any' to bypass TypeScript strict type checking
            const { error } = await (supabase as any)
                .from("payment_plans")
                .update({ is_active: !plan.is_active })
                .eq("id", plan.id);

            if (error) throw error;
            toast({ title: `Plan ${!plan.is_active ? "activated" : "deactivated"}` });
            await fetchPlans();
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to update",
                variant: "destructive",
            });
        }
        setActionMenu(null);
    }

    async function deletePlan(plan: PaymentPlan) {
        if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) return;

        try {
            // Use 'as any' to bypass TypeScript strict type checking
            const { error } = await (supabase as any)
                .from("payment_plans")
                .delete()
                .eq("id", plan.id);

            if (error) throw error;
            toast({ title: "Plan deleted successfully" });
            await fetchPlans();
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to delete",
                variant: "destructive",
            });
        }
        setActionMenu(null);
    }

    function formatPrice(cents: number): string {
        return cents === 0 ? "Free" : `$${(cents / 100).toFixed(0)}`;
    }

    function formatLimit(value: number | null): string {
        return value == null ? "Unlimited" : `${value} members`;
    }

    const filteredPlans = plans.filter(
        (plan) =>
            plan.name.toLowerCase().includes(search.toLowerCase()) ||
            plan.slug.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Payment Plans ({plans.length})</h1>
                    <p className="text-slate-500">Manage your subscription plans and pricing</p>
                </div>
                <Link to="/admin/payment-plans/new">
                    <Button>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Plan
                    </Button>
                </Link>
            </div>

            {/* Table Card */}
            <Card>
                {/* Search Bar */}
                <CardHeader className="border-b">
                    <div className="relative max-w-xs">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search plans..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </CardHeader>

                {/* Table */}
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Plan</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Team Limit</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Stripe</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPlans.map((plan, index) => (
                                    <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                                        {/* Plan Name with Icon */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full ${planColors[index % planColors.length]} flex items-center justify-center text-white font-semibold text-sm`}>
                                                    {plan.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{plan.name}</span>
                                                        {plan.is_popular && (
                                                            <Badge className="bg-blue-100 text-blue-700 text-xs">Popular</Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-slate-500">{plan.slug}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Price */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">{formatPrice(plan.price_monthly)}</span>
                                                <span className="text-slate-500 text-sm">/mo</span>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {formatPrice(plan.price_yearly)}/yr
                                            </span>
                                        </td>

                                        {/* Members Limit */}
                                        <td className="px-4 py-4">
                                            <span>{formatLimit(plan.limit_members)}</span>
                                        </td>

                                        {/* Stripe Status */}
                                        <td className="px-4 py-4">
                                            {plan.stripe_price_id_monthly ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-sm text-slate-500">Connected</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                    <span className="text-sm text-slate-500">Not set</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-4">
                                            <Badge className={plan.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                                                {plan.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Edit Button */}
                                                <Link to={`/admin/payment-plans/${plan.id}`}>
                                                    <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="Edit">
                                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                </Link>
                                                {/* More Actions Menu */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActionMenu(actionMenu === plan.id ? null : plan.id)}
                                                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                                                        </svg>
                                                    </button>

                                                    {actionMenu === plan.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border shadow-lg z-20 py-1">
                                                                <button
                                                                    onClick={() => toggleActive(plan)}
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    {plan.is_active ? "Deactivate" : "Activate"}
                                                                </button>
                                                                <button
                                                                    onClick={() => deletePlan(plan)}
                                                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredPlans.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            {search ? (
                                <p>No plans found matching "{search}"</p>
                            ) : (
                                <p>No payment plans found. Add plans via Supabase dashboard.</p>
                            )}
                        </div>
                    )}
                </CardContent>

                {/* Footer */}
                {filteredPlans.length > 0 && (
                    <div className="px-4 py-3 border-t text-sm text-slate-500">
                        Showing {filteredPlans.length} of {plans.length} plans
                    </div>
                )}
            </Card>
        </div>
    );
}
