import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { SiteLogo } from "@/components/site-logo";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
    const [brandName, setBrandName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const { signIn, signInWithMagicLink } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Show toast for URL messages
    useEffect(() => {
        const message = searchParams.get("message");
        const error = searchParams.get("error");

        if (message === "account_created") {
            toast({
                title: "Account Created! 🎉",
                description: "Your account has been created successfully. Please sign in with your credentials.",
            });
        }

        if (error) {
            toast({
                title: "Error",
                description: error === "auth_callback_failed"
                    ? "Authentication failed. Please try again."
                    : error,
                variant: "destructive",
            });
        }
    }, [searchParams, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await signIn(email, password);
            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                navigate("/dashboard");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email) {
            toast({
                title: "Email required",
                description: "Please enter your email address first",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await signInWithMagicLink(email);
            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setMagicLinkSent(true);
                toast({
                    title: "Check your email",
                    description: "We've sent you a magic link to sign in",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send magic link",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (magicLinkSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Check your email</h2>
                        <p className="text-muted-foreground mb-4">
                            We've sent a magic link to <strong>{email}</strong>
                        </p>
                        <Button variant="ghost" onClick={() => setMagicLinkSent(false)}>
                            ← Back to login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <SiteLogo size="lg" showText={true} />
                    </div>
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>Sign in to your brand to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="brand">Brand Name</Label>
                            <Input
                                id="brand"
                                type="text"
                                placeholder="Enter your brand name"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
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
                            />
                        </div>
                        <Button type="submit" className="w-full" isLoading={loading}>
                            Sign in →
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={handleMagicLink}
                            className="text-sm text-primary hover:underline"
                            disabled={loading}
                        >
                            Sign in with magic link
                        </button>
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </CardContent>
            </Card>

            <p className="fixed bottom-4 text-center text-sm text-muted-foreground w-full">
                © {new Date().getFullYear()} SaaS Starter Kit. All rights reserved.
            </p>
        </div>
    );
}
