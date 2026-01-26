import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get the authorization header to verify the user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create a client with the user's JWT to verify their identity
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: authHeader },
            },
        });

        // Verify the user's session
        const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
        if (authError || !authUser) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired session" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { priceId, successUrl, cancelUrl } = await req.json();

        if (!priceId) {
            return new Response(
                JSON.stringify({ error: "Missing priceId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Use service role for database operations
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const userId = authUser.id;

        // Get or create Stripe customer
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .single();

        let customerId = subscription?.stripe_customer_id;

        if (!customerId && authUser.email) {
            const customer = await stripe.customers.create({
                email: authUser.email,
                metadata: { user_id: userId },
            });
            customerId = customer.id;

            // Save customer ID
            await supabase.from("subscriptions").upsert({
                user_id: userId,
                stripe_customer_id: customerId,
                status: "incomplete",
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
            cancel_url: cancelUrl || `${req.headers.get("origin")}/dashboard/billing?checkout=canceled`,
            metadata: { user_id: userId },
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Checkout error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
