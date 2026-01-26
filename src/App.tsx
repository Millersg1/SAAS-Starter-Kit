import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileProvider } from "@/hooks/useProfile";
import { DynamicFavicon } from "@/components/dynamic-favicon";

// Layouts
import MarketingLayout from "@/layouts/MarketingLayout";
import AdminLayout from "@/layouts/AdminLayout";
import DocsLayout from "@/layouts/DocsLayout";

// Marketing Pages
import Index from "@/pages/Index";
import Pricing from "@/pages/Pricing";
import NotFound from "@/pages/NotFound";

// Auth Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import AuthCallback from "@/pages/auth/AuthCallback";

// Dashboard Pages
import Dashboard from "@/pages/dashboard/Dashboard";
import Billing from "@/pages/dashboard/Billing";
import Settings from "@/pages/dashboard/Settings";
import Support from "@/pages/dashboard/Support";
import TicketDetail from "@/pages/dashboard/TicketDetail";
import Team from "@/pages/dashboard/Team";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminLogin from "@/pages/admin/Login";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";
import AdminEmails from "@/pages/admin/Emails";
import AdminPaymentPlans from "@/pages/admin/PaymentPlans";
import AdminPaymentPlanEdit from "@/pages/admin/PaymentPlanEdit";
import AdminSupport from "@/pages/admin/Support";
import AdminTicketDetail from "@/pages/admin/TicketDetail";
import AdminSecurity from "@/pages/admin/Security";
import AdminProfile from "@/pages/admin/Profile";

// Docs Pages
import Docs from "@/pages/docs/Docs";
import DocsBilling from "@/pages/docs/Billing";
import DocsTeam from "@/pages/docs/Team";
import DocsFAQ from "@/pages/docs/FAQ";
import DocsProfile from "@/pages/docs/Profile";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ssk-theme">
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <ProfileProvider>
                    <DynamicFavicon />
                    <BrowserRouter>
                        <Routes>
                            {/* Marketing Pages with Layout */}
                            <Route element={<MarketingLayout />}>
                                <Route path="/" element={<Index />} />
                                <Route path="/pricing" element={<Pricing />} />
                            </Route>

                            {/* Docs Pages with DocsLayout (sidebar) */}
                            <Route path="/docs" element={<DocsLayout />}>
                                <Route index element={<Docs />} />
                                <Route path="billing" element={<DocsBilling />} />
                                <Route path="team" element={<DocsTeam />} />
                                <Route path="faq" element={<DocsFAQ />} />
                                <Route path="profile" element={<DocsProfile />} />
                            </Route>

                            {/* Auth Pages (no layout) */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/auth/callback" element={<AuthCallback />} />

                            {/* Dashboard Pages */}
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/dashboard/billing" element={<Billing />} />
                            <Route path="/dashboard/settings" element={<Settings />} />
                            <Route path="/dashboard/support" element={<Support />} />
                            <Route path="/dashboard/support/:id" element={<TicketDetail />} />
                            <Route path="/dashboard/team" element={<Team />} />

                            {/* Admin Pages with Admin Layout */}
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="login" element={<AdminLogin />} />
                                <Route path="users" element={<AdminUsers />} />
                                <Route path="settings" element={<AdminSettings />} />
                                <Route path="emails" element={<AdminEmails />} />
                                <Route path="payment-plans" element={<AdminPaymentPlans />} />
                                <Route path="payment-plans/:id" element={<AdminPaymentPlanEdit />} />
                                <Route path="support" element={<AdminSupport />} />
                                <Route path="support/:id" element={<AdminTicketDetail />} />
                                <Route path="security" element={<AdminSecurity />} />
                                <Route path="profile" element={<AdminProfile />} />
                            </Route>

                            {/* Catch all */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </ProfileProvider>
            </TooltipProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

export default App;
