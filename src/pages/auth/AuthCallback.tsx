import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<"loading" | "checkout_success" | "error">("loading");

    useEffect(() => {
        const handleCallback = async () => {
            const type = searchParams.get("type");
            const checkout = searchParams.get("checkout");

            // Handle Stripe checkout success - just show the page, don't redirect
            if (checkout === "success") {
                setStatus("checkout_success");
                return;
            }

            // Handle OAuth callback
            const { error } = await supabase.auth.exchangeCodeForSession(
                window.location.href
            );

            if (error) {
                console.error("Auth callback error:", error);
                setStatus("error");
                setTimeout(() => navigate("/login?error=auth_callback_failed"), 2000);
                return;
            }

            // Redirect based on callback type
            if (type === "recovery") {
                navigate("/dashboard/settings?reset_password=true");
            } else {
                navigate("/dashboard");
            }
        };

        handleCallback();
    }, [navigate, searchParams]);

    if (status === "checkout_success") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
                    <p className="text-muted-foreground mb-6">
                        Your account has been created successfully. Check your email for confirmation, then sign in with your credentials.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="w-full">
                            Sign In to Your Account
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-destructive">Authentication failed. Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}

