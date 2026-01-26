import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
        const { email, password, fullName, brandName, planSlug, billingInterval } = await req.json();

        // Validate required fields
        if (!email || !password || !brandName || !planSlug) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get the payment plan
        const { data: plan, error: planError } = await supabase
            .from("payment_plans")
            .select("*")
            .eq("slug", planSlug)
            .single();

        if (planError || !plan) {
            return new Response(
                JSON.stringify({ error: "Plan not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get the right price ID based on interval
        const priceId = billingInterval === "year"
            ? plan.stripe_price_id_yearly
            : plan.stripe_price_id_monthly;

        if (!priceId) {
            return new Response(
                JSON.stringify({ error: "Stripe price ID not configured for this plan" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create pending signup (password will be hashed by Supabase Auth when creating user)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

        const { data: pendingSignup, error: pendingError } = await supabase
            .from("pending_signups")
            .upsert({
                email,
                full_name: fullName,
                brand_name: brandName,
                password: password, // Stored temporarily, Supabase Auth hashes it when creating user
                plan_slug: planSlug,
                billing_interval: billingInterval || "month",
                expires_at: expiresAt.toISOString(),
            }, { onConflict: "email" })
            .select()
            .single();

        if (pendingError) {
            console.error("Pending signup error:", pendingError);
            return new Response(
                JSON.stringify({ error: "Failed to create pending signup" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const origin = req.headers.get("origin") || "http://localhost:5173";

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/auth/callback?checkout=success`,
            cancel_url: `${origin}/signup?plan=${planSlug}&interval=${billingInterval}&canceled=true`,
            metadata: {
                pending_signup_id: pendingSignup.id.toString(),
                email,
                brand_name: brandName,
            },
        });

        // Update pending signup with checkout session ID
        await supabase
            .from("pending_signups")
            .update({ stripe_checkout_session_id: session.id })
            .eq("id", pendingSignup.id);

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Signup checkout error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
