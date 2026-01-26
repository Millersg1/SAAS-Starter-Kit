import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type User = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
    updated_at: string;
    current_brand_id: string | null;
    brand?: {
        name: string;
    } | null;
};

type PaymentPlan = {
    id: string;
    slug: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
};

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
    const [newPassword, setNewPassword] = useState("");
    const [selectedPlanOption, setSelectedPlanOption] = useState(""); // format: "slug:interval"
    const { toast } = useToast();

    const pageSize = 10;

    useEffect(() => {
        loadUsers();
        loadPaymentPlans();
    }, [currentPage]);

    async function loadPaymentPlans() {
        try {
            const { data } = await supabase
                .from("payment_plans" as any)
                .select("id, slug, name, price_monthly, price_yearly")
                .eq("is_active", true)
                .order("price_monthly", { ascending: true });

            if (data) {
                setPaymentPlans(data as unknown as PaymentPlan[]);
            }
        } catch (err) {
            console.error("Error loading payment plans:", err);
        }
    }

    async function loadUsers() {
        setIsLoading(true);

        try {
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, count, error } = await supabase
                .from("profiles")
                .select(`
                    id, email, full_name, avatar_url, role, created_at, updated_at, current_brand_id,
                    brands:current_brand_id (name)
                `, { count: "exact" })
                .neq("role", "admin")
                .range(from, to)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error loading users:", error);
                toast({
                    title: "Error",
                    description: "Failed to load users: " + error.message,
                    variant: "destructive",
                });
                return;
            }

            const transformedUsers = (data || []).map((u: any) => ({
                ...u,
                brand: Array.isArray(u.brands) ? u.brands[0] : u.brands,
            }));
            setUsers(transformedUsers as User[]);
            setTotalUsers(count || 0);
        } catch (err) {
            console.error("Error loading users:", err);
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            (user.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    async function handleDeleteUser() {
        if (!selectedUser) return;
        setActionLoading(true);

        // Delete brand_members first
        await supabase
            .from("brand_members" as any)
            .delete()
            .eq("user_id", selectedUser.id);

        // Delete profile
        const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", selectedUser.id);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to delete user: " + error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: "User deleted successfully",
            });
            setShowDeleteModal(false);
            loadUsers();
        }

        setActionLoading(false);
    }

    async function handleResetPassword() {
        if (!selectedUser || !newPassword) return;

        if (newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        setActionLoading(true);

        try {
            const { error } = await supabase.functions.invoke("admin-users", {
                body: {
                    action: "reset_password",
                    userId: selectedUser.id,
                    newPassword,
                },
            });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Password updated successfully",
            });
            setNewPassword("");
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to reset password",
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    }

    async function handleChangePlan() {
        if (!selectedUser || !selectedPlanOption) return;

        // Parse plan slug from option (format: "slug:interval" or just "slug")
        const planSlug = selectedPlanOption.includes(":")
            ? selectedPlanOption.split(":")[0]
            : selectedPlanOption;

        if (!selectedUser.current_brand_id) {
            toast({
                title: "Error",
                description: "User doesn't have a brand. Cannot change plan.",
                variant: "destructive",
            });
            return;
        }

        setActionLoading(true);

        try {
            // Check if subscription exists for brand
            const { data: existingSub } = await supabase
                .from("subscriptions" as any)
                .select("id")
                .eq("brand_id", selectedUser.current_brand_id)
                .maybeSingle();

            if (existingSub) {
                // Update existing subscription
                const { error } = await supabase
                    .from("subscriptions" as any)
                    .update({
                        plan: planSlug,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("brand_id", selectedUser.current_brand_id);

                if (error) throw error;
            } else {
                // Create new subscription for brand
                const { error } = await supabase
                    .from("subscriptions" as any)
                    .insert({
                        brand_id: selectedUser.current_brand_id,
                        plan: planSlug,
                        status: "active",
                    });

                if (error) throw error;
            }

            toast({
                title: "Success",
                description: "Plan updated successfully",
            });
            loadUsers(); // Refresh the user list
        } catch (err) {
            console.error("Error changing plan:", err);
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to change plan",
                variant: "destructive",
            });
        } finally {
            setActionLoading(false);
        }
    }

    function openEditModal(user: User) {
        setSelectedUser(user);
        setNewPassword("");
        setSelectedPlanOption("");
        setShowEditModal(true);
    }

    function handleExportCSV() {
        const csv = [
            ["Name", "Email", "Brand", "Created At"].join(","),
            ...filteredUsers.map((u) =>
                [
                    u.full_name || "",
                    u.email,
                    u.brand?.name || "",
                    new Date(u.created_at).toLocaleDateString(),
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
            title: "Exported",
            description: "Users exported to CSV",
        });
    }

    const totalPages = Math.ceil(totalUsers / pageSize);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users ({totalUsers})</h1>
                    <p className="text-muted-foreground">Manage all registered users</p>
                </div>
                <Button onClick={handleExportCSV}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </Button>
            </div>

            {/* Table Card */}
            <div className="bg-card rounded-xl border border-border">
                {/* Search Bar */}
                <div className="p-4 border-b border-border">
                    <div className="relative max-w-xs">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    User
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Brand
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                    {/* User */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">{user.full_name || "No name"}</span>
                                                <span className="block text-sm text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Brand */}
                                    <td className="px-4 py-4">
                                        <span className="text-foreground">
                                            {user.brand?.name || "-"}
                                        </span>
                                    </td>

                                    {/* Created */}
                                    <td className="px-4 py-4">
                                        <span className="text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Edit */}
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                                title="Edit user"
                                            >
                                                <svg className="w-4 h-4 text-muted-foreground hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {/* Delete */}
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                                title="Delete user"
                                            >
                                                <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {search ? (
                            <p>No users found matching "{search}"</p>
                        ) : (
                            <p>No users found.</p>
                        )}
                    </div>
                )}

                {/* Footer with Pagination */}
                {filteredUsers.length > 0 && (
                    <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages || 1} ({totalUsers} users)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur z-40" onClick={() => setShowEditModal(false)} />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl border border-border shadow-lg max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Edit User</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                                <p className="font-medium">{selectedUser.full_name || "No name"}</p>
                                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                            </div>

                            {/* Password Reset Section */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Reset Password</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="New password (min 6 chars)"
                                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                    <Button
                                        onClick={handleResetPassword}
                                        disabled={!newPassword || newPassword.length < 6 || actionLoading}
                                        isLoading={actionLoading}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>

                            {/* Plan Change Section */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Change Plan</label>
                                {!selectedUser.current_brand_id ? (
                                    <p className="text-sm text-muted-foreground italic">User has no brand. Cannot change plan.</p>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedPlanOption}
                                            onChange={(e) => setSelectedPlanOption(e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">Select a plan</option>
                                            {paymentPlans.map((plan) => (
                                                <optgroup key={plan.id} label={plan.name}>
                                                    <option value={`${plan.slug}:monthly`}>
                                                        {plan.name} (Monthly) - ${(plan.price_monthly / 100).toFixed(2)}/mo
                                                    </option>
                                                    <option value={`${plan.slug}:yearly`}>
                                                        {plan.name} (Yearly) - ${(plan.price_yearly / 100).toFixed(2)}/yr
                                                    </option>
                                                </optgroup>
                                            ))}
                                        </select>
                                        <Button
                                            onClick={handleChangePlan}
                                            disabled={!selectedPlanOption || actionLoading}
                                            isLoading={actionLoading}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Close Button */}
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur z-40" onClick={() => setShowDeleteModal(false)} />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl border border-border shadow-lg max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold mb-4 text-destructive">Delete User</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Are you sure you want to delete {selectedUser.full_name || selectedUser.email}? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="danger" onClick={handleDeleteUser} isLoading={actionLoading}>
                                    Delete User
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
