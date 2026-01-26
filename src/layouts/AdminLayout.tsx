import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { adminNav } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteLogo } from "@/components/site-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

// Icons for sidebar
const Icons: Record<string, React.ReactNode> = {
    chart: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    support: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    "credit-card": (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    ),
    mail: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ),
    settings: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    shield: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
};

function AdminSidebar() {
    const location = useLocation();

    return (
        <aside className="hidden lg:flex lg:flex-col w-64 border-r border-border bg-card">
            {/* Logo */}
            <div className="h-16 flex items-center justify-center px-6 border-b border-border">
                <SiteLogo size="sm" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {adminNav.map((item) => {
                    const isActive = location.pathname === item.href ||
                        (item.href !== "/admin" && location.pathname.startsWith(item.href));
                    const Icon = Icons[item.icon];

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-500"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            style={isActive ? { color: "#ffffff" } : undefined}
                        >
                            {Icon}
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

function AdminTopBar() {
    const [profileOpen, setProfileOpen] = useState(false);
    const { profile } = useProfile();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "Admin";
    const displayEmail = profile?.email || user?.email || "";
    const initials = displayName.charAt(0).toUpperCase();

    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
            <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
            <div className="flex items-center gap-4">
                <ThemeToggle />

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2"
                    >
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {initials}
                            </div>
                        )}
                    </button>
                    {profileOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setProfileOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
                                <div className="p-2 border-b border-border">
                                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                                </div>
                                <div className="p-1">
                                    <Link
                                        to="/admin/profile"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted"
                                    >
                                        Edit Profile
                                    </Link>
                                </div>
                                <div className="p-1 border-t border-border">
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive rounded-md hover:bg-muted"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        async function checkAdminRole() {
            // Wait for auth to finish loading
            if (authLoading) return;

            // Skip check for login page
            if (location.pathname === "/admin/login") {
                setCheckingRole(false);
                return;
            }

            // If not logged in, redirect to admin login
            if (!user) {
                console.log("AdminLayout: No user, redirecting to login");
                sessionStorage.removeItem("admin_verified");
                sessionStorage.removeItem("admin_verified_at");
                navigate("/admin/login", { replace: true });
                setCheckingRole(false);
                return;
            }

            // Check sessionStorage for verified admin (set during login)
            const verifiedUserId = sessionStorage.getItem("admin_verified");
            const verifiedAt = sessionStorage.getItem("admin_verified_at");
            const ONE_HOUR = 60 * 60 * 1000;

            // If we have a valid, recent verification for this user, trust it
            if (verifiedUserId === user.id && verifiedAt) {
                const timeSinceVerification = Date.now() - parseInt(verifiedAt, 10);
                if (timeSinceVerification < ONE_HOUR) {
                    console.log("AdminLayout: Using cached admin verification");
                    setIsAdmin(true);
                    setCheckingRole(false);
                    return;
                }
            }

            // Verify with database
            try {
                const { data: profile, error } = await (supabase as any)
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (error) {
                    console.error("AdminLayout: Profile query error:", error);
                    // Clear verification and redirect
                    sessionStorage.removeItem("admin_verified");
                    sessionStorage.removeItem("admin_verified_at");
                    navigate("/admin/login", { replace: true });
                    setCheckingRole(false);
                    return;
                }

                const role = (profile as any)?.role;
                console.log("AdminLayout: User role from DB:", role);

                if (role === "admin") {
                    // Update sessionStorage with fresh verification
                    sessionStorage.setItem("admin_verified", user.id);
                    sessionStorage.setItem("admin_verified_at", Date.now().toString());
                    setIsAdmin(true);
                } else {
                    console.log("AdminLayout: Not admin, redirecting");
                    sessionStorage.removeItem("admin_verified");
                    sessionStorage.removeItem("admin_verified_at");
                    setIsAdmin(false);
                    navigate("/admin/login", { replace: true });
                }
            } catch (error) {
                console.error("AdminLayout: Failed to check admin role:", error);
                sessionStorage.removeItem("admin_verified");
                sessionStorage.removeItem("admin_verified_at");
                navigate("/admin/login", { replace: true });
            } finally {
                setCheckingRole(false);
            }
        }

        checkAdminRole();
    }, [user, authLoading, navigate, location.pathname]);

    // Skip admin layout for login page - render children directly
    if (location.pathname === "/admin/login") {
        return <Outlet />;
    }

    // Show loading while checking auth/role
    if (authLoading || checkingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Not admin - will redirect in useEffect
    if (!isAdmin) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <AdminSidebar />
            <div className="flex-1 flex flex-col">
                <AdminTopBar />
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
