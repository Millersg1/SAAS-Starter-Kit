import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { SiteLogo } from "@/components/site-logo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Sign in the user
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (!authData.user) {
                setError("Authentication failed");
                return;
            }

            // Check if user is an admin
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, email")
                .eq("id", authData.user.id)
                .single();

            if (profileError) {
                console.error("Profile lookup error:", profileError);
                await supabase.auth.signOut();
                setError(`Profile lookup failed: ${profileError.message}`);
                return;
            }

            if (!profile) {
                await supabase.auth.signOut();
                setError("Profile not found. Please ensure admin user is created.");
                return;
            }

            if ((profile as any).role !== "admin") {
                await supabase.auth.signOut();
                setError(`Access denied. Your role is "${(profile as any).role || 'user'}". Admin privileges required.`);
                return;
            }

            // Admin login successful - store verification in sessionStorage
            sessionStorage.setItem("admin_verified", authData.user.id);
            sessionStorage.setItem("admin_verified_at", Date.now().toString());

            toast({
                title: "Welcome back!",
                description: "Successfully signed in to admin panel",
            });

            // Use window.location to force full page reload and ensure auth state is fresh
            window.location.href = "/admin";
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <SiteLogo size="lg" showText={false} />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Admin Login</CardTitle>
                            <CardDescription>Sign in to access the admin panel</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your admin email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                                Sign in to Admin →
                            </Button>
                        </form>

                        {/* Back Link */}
                        <p className="text-center text-sm text-muted-foreground">
                            Not an admin?{" "}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Regular login
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <p className="mt-8 text-sm text-muted-foreground">
                © {new Date().getFullYear()} SaaS Starter Kit. All rights reserved.
            </p>
        </div>
    );
}
