import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/site-logo";

export default function Signup() {
    const [brandName, setBrandName] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get plan info from URL (passed from Pricing page)
    const plan = searchParams.get("plan");
    const interval = searchParams.get("interval") || "month";
    const canceled = searchParams.get("canceled");
    const isPaidPlan = plan && plan !== "free";

    useEffect(() => {
        if (canceled === "true") {
            toast({
                title: "Payment canceled",
                description: "Your payment was canceled. Please try again.",
                variant: "destructive",
            });
        }
    }, [canceled, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validate brand name
        if (!brandName.trim()) {
            toast({
                title: "Brand name required",
                description: "Please enter your company or project name.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        // For paid plans, we need to redirect to Stripe checkout
        if (isPaidPlan) {
            // Create pending signup and redirect to checkout
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const response = await fetch(`${supabaseUrl}/functions/v1/signup-checkout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${supabaseAnonKey}`,
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        fullName,
                        brandName,
                        planSlug: plan,
                        billingInterval: interval,
                    }),
                });

                const data = await response.json();

                if (data.url) {
                    // Redirect to Stripe checkout
                    window.location.href = data.url;
                } else {
                    toast({
                        title: "Error",
                        description: data.error || "Failed to create checkout session",
                        variant: "destructive",
                    });
                    setLoading(false);
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to start checkout. Please try again.",
                    variant: "destructive",
                });
                setLoading(false);
            }
            return;
        }

        // Free plan - regular signup
        const { error } = await signUp(email, password, fullName, brandName);

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Check your email",
                description: "We've sent you a confirmation link to verify your account.",
            });
            navigate("/login");
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <SiteLogo size="lg" />
                    </div>
                    <CardTitle className="text-2xl">Create your account</CardTitle>
                    <CardDescription>
                        {isPaidPlan
                            ? `Start your ${plan} plan ${interval === "year" ? "yearly" : "monthly"} subscription`
                            : "Start building with your brand"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="brandName" className="text-sm font-medium">
                                Brand Name
                            </label>
                            <Input
                                id="brandName"
                                type="text"
                                placeholder="Your company or project name"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                required
                            />
                            <p className="text-xs text-slate-500">This will be your workspace name</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium">
                                Full Name
                            </label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email address
                            </label>
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
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-slate-500">Minimum 8 characters</p>
                        </div>

                        <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                            {isPaidPlan ? "Continue to Payment →" : "Create account →"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-500 hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
