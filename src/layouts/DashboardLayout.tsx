import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteLogo } from "@/components/site-logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
    Home,
    Users,
    HelpCircle,
    CreditCard,
    Menu,
    X,
    Search,
    User,
    LogOut,
    ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

// Main navigation items
const mainNavItems = [
    { to: "/dashboard", icon: Home, label: "Overview" },
    { to: "/dashboard/team", icon: Users, label: "Team" },
];

// Bottom navigation items
const bottomNavItems = [
    { to: "/dashboard/support", icon: HelpCircle, label: "Help & Support" },
];

// Sidebar Component
function Sidebar({ onClose }: { onClose?: () => void }) {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === "/dashboard") {
            return location.pathname === "/dashboard";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="flex flex-col w-64 border-r border-border bg-card h-full">
            {/* Logo */}
            <div className="h-16 flex items-center justify-center px-6 border-b border-border relative">
                <SiteLogo size="sm" />
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-muted absolute right-4">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {mainNavItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive(item.to)
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Bottom Navigation */}
            <div className="p-4 border-t border-border space-y-1">
                {bottomNavItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive(item.to)
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </Link>
                ))}
            </div>
        </aside>
    );
}

// Mobile Menu Component
function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            {/* Sidebar */}
            <div className="absolute left-0 top-0 h-full w-64 animate-in slide-in-from-left duration-200">
                <Sidebar onClose={onClose} />
            </div>
        </div>
    );
}

// Mobile Header Component
function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
    return (
        <header className="lg:hidden sticky top-0 z-40 h-16 flex items-center justify-between px-4 border-b border-border bg-card">
            <SiteLogo size="sm" />

            <button
                onClick={onMenuOpen}
                className="p-2 rounded-lg hover:bg-muted"
                aria-label="Open menu"
            >
                <Menu className="w-6 h-6" />
            </button>
        </header>
    );
}

// TopBar Component (Desktop)
function TopBar() {
    const [profileOpen, setProfileOpen] = useState(false);
    const { profile } = useProfile();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "User";
    const displayEmail = profile?.email || user?.email || "";
    const initials = displayName.charAt(0).toUpperCase();

    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    return (
        <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-border bg-card">
            {/* Search */}
            <div className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search..."
                        className="w-full h-9 pl-9 pr-12 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <ThemeToggle />

                {/* Profile dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted"
                    >
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                {initials}
                            </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Dropdown Menu */}
                    {profileOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setProfileOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
                                <div className="p-2 border-b border-border">
                                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                                </div>
                                <div className="p-1">
                                    <Link
                                        to="/dashboard/settings"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted"
                                    >
                                        <User className="w-4 h-4" />
                                        Edit Profile
                                    </Link>
                                    <Link
                                        to="/dashboard/billing"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground rounded-md hover:bg-muted"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Billing
                                    </Link>
                                </div>
                                <div className="p-1 border-t border-border">
                                    <button
                                        onClick={handleSignOut}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 rounded-md hover:bg-muted"
                                    >
                                        <LogOut className="w-4 h-4" />
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

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block sticky top-0 h-screen">
                <Sidebar />
            </div>

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col">
                <MobileHeader onMenuOpen={() => setMobileMenuOpen(true)} />
                <TopBar />
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
