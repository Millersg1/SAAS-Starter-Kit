import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { supabase } from "@/integrations/supabase/client";
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
    trial_days: number;
    trial_enabled: boolean;
    limit_members: number | null;
    features: string[];
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
}

const defaultPlan: Omit<PaymentPlan, "id"> = {
    public_id: "",
    slug: "",
    name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
    trial_days: 0,
    trial_enabled: false,
    limit_members: null,
    features: [],
    is_popular: false,
    is_active: true,
    sort_order: 0,
};

export default function PaymentPlanEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === "new";
    const { toast } = useToast();

    const [plan, setPlan] = useState<Omit<PaymentPlan, "id"> & { id?: number }>(defaultPlan);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newFeature, setNewFeature] = useState("");

    useEffect(() => {
        if (!isNew && id) {
            fetchPlan();
        }
    }, [id, isNew]);

    async function fetchPlan() {
        try {
            const { data, error } = await (supabase as any)
                .from("payment_plans")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            setPlan(data);
        } catch (err: any) {
            setError(err.message || "Failed to load plan");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const planData = {
                slug: plan.slug,
                name: plan.name,
                description: plan.description || null,
                price_monthly: plan.price_monthly,
                price_yearly: plan.price_yearly,
                stripe_price_id_monthly: plan.stripe_price_id_monthly || null,
                stripe_price_id_yearly: plan.stripe_price_id_yearly || null,
                trial_days: plan.trial_days,
                trial_enabled: plan.trial_enabled,
                limit_members: plan.limit_members,
                features: plan.features,
                is_popular: plan.is_popular,
                is_active: plan.is_active,
                sort_order: plan.sort_order,
            };

            if (isNew) {
                const { error } = await (supabase as any)
                    .from("payment_plans")
                    .insert(planData);
                if (error) throw error;
                toast({ title: "Plan created successfully" });
            } else {
                const { error } = await (supabase as any)
                    .from("payment_plans")
                    .update(planData)
                    .eq("id", id);
                if (error) throw error;
                toast({ title: "Plan updated successfully" });
            }

            navigate("/admin/payment-plans");
        } catch (err: any) {
            setError(err.message || "Failed to save plan");
        } finally {
            setSaving(false);
        }
    }

    function handleChange(field: keyof typeof plan, value: unknown) {
        setPlan((prev) => ({ ...prev, [field]: value }));
    }

    function addFeature() {
        if (newFeature.trim()) {
            setPlan((prev) => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
            setNewFeature("");
        }
    }

    function removeFeature(index: number) {
        setPlan((prev) => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index),
        }));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/payment-plans">
                    <Button variant="ghost" className="p-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">
                        {isNew ? "Create Payment Plan" : `Edit: ${plan.name}`}
                    </h1>
                    <p className="text-slate-500">
                        {isNew ? "Add a new pricing plan" : "Modify plan settings and limits"}
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Slug</label>
                                <input
                                    type="text"
                                    value={plan.slug}
                                    onChange={(e) => handleChange("slug", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    placeholder="e.g., starter"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Used internally for references</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    value={plan.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    placeholder="e.g., Starter"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <input
                                type="text"
                                value={plan.description || ""}
                                onChange={(e) => handleChange("description", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border"
                                placeholder="e.g., For growing teams"
                            />
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={plan.is_popular}
                                    onChange={(e) => handleChange("is_popular", e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm">Mark as Popular</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={plan.is_active}
                                    onChange={(e) => handleChange("is_active", e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm">Active (visible to users)</span>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Monthly Price (cents)</label>
                                <input
                                    type="number"
                                    value={plan.price_monthly}
                                    onChange={(e) => handleChange("price_monthly", parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    min="0"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Display: ${(plan.price_monthly / 100).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Yearly Price (cents)</label>
                                <input
                                    type="number"
                                    value={plan.price_yearly}
                                    onChange={(e) => handleChange("price_yearly", parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    min="0"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Display: ${(plan.price_yearly / 100).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stripe Integration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stripe Integration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Monthly Price ID</label>
                                <input
                                    type="text"
                                    value={plan.stripe_price_id_monthly || ""}
                                    onChange={(e) => handleChange("stripe_price_id_monthly", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
                                    placeholder="price_..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Yearly Price ID</label>
                                <input
                                    type="text"
                                    value={plan.stripe_price_id_yearly || ""}
                                    onChange={(e) => handleChange("stripe_price_id_yearly", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
                                    placeholder="price_..."
                                />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">
                            Get these IDs from your{" "}
                            <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Stripe Dashboard
                            </a>
                        </p>
                    </CardContent>
                </Card>

                {/* Free Trial */}
                <Card>
                    <CardHeader>
                        <CardTitle>Free Trial</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={plan.trial_enabled}
                                onChange={(e) => handleChange("trial_enabled", e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium">Enable Free Trial</span>
                        </label>
                        {plan.trial_enabled && (
                            <div className="w-48">
                                <label className="block text-sm font-medium mb-1">Trial Days</label>
                                <input
                                    type="number"
                                    value={plan.trial_days}
                                    onChange={(e) => handleChange("trial_days", parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    min="1"
                                    max="90"
                                    placeholder="14"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Limits */}
                <Card>
                    <CardHeader>
                        <CardTitle>Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">Leave empty for unlimited</p>
                        <div className="w-48">
                            <label className="block text-sm font-medium mb-1">Team Members</label>
                            <input
                                type="number"
                                value={plan.limit_members ?? ""}
                                onChange={(e) => handleChange("limit_members", e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 rounded-lg border"
                                min="0"
                                placeholder="Unlimited"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Features */}
                <Card>
                    <CardHeader>
                        <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                                className="flex-1 px-3 py-2 rounded-lg border"
                                placeholder="Add a feature..."
                            />
                            <Button type="button" onClick={addFeature}>Add</Button>
                        </div>
                        <ul className="space-y-2">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                                    <span>{feature}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFeature(i)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Link to="/admin/payment-plans">
                        <Button variant="outline" type="button">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : isNew ? "Create Plan" : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
