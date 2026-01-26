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

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
        return new Response("Missing signature or webhook secret", { status: 400 });
    }

    try {
        const body = await req.text();
        const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                const pendingSignupId = session.metadata?.pending_signup_id;

                console.log("Checkout completed - pending_signup_id:", pendingSignupId);

                if (pendingSignupId) {
                    // Get pending signup record
                    const { data: pending, error: pendingError } = await supabase
                        .from("pending_signups")
                        .select("*")
                        .eq("id", pendingSignupId)
                        .single();

                    if (pendingError || !pending) {
                        console.error("Pending signup not found:", pendingSignupId, pendingError);
                        break;
                    }

                    console.log("Creating user for:", pending.email);

                    // Create user via Auth Admin API
                    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
                        email: pending.email,
                        password: pending.password,
                        email_confirm: true,
                        user_metadata: {
                            full_name: pending.full_name,
                            brand_name: pending.brand_name,
                        },
                    });

                    if (userError || !newUser.user) {
                        console.error("Failed to create user:", userError);
                        break;
                    }

                    console.log("User created:", newUser.user.id);

                    // Wait a moment for the profile trigger to create the brand
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Get the brand that was created by the database trigger
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("current_brand_id")
                        .eq("id", newUser.user.id)
                        .single();

                    if (profile?.current_brand_id) {
                        // Create subscription
                        const { error: subError } = await supabase.from("subscriptions").insert({
                            brand_id: profile.current_brand_id,
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            plan: pending.plan_slug,
                            status: "active",
                            updated_at: new Date().toISOString(),
                        });

                        if (subError) {
                            console.error("Failed to create subscription:", subError);
                        } else {
                            console.log("Subscription created for brand:", profile.current_brand_id);
                        }
                    } else {
                        console.error("No brand found for user:", newUser.user.id);
                    }

                    // Send welcome email using database template
                    try {
                        const userName = pending.full_name || pending.email.split("@")[0];
                        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${supabaseServiceKey}`,
                                "apikey": supabaseServiceKey,
                            },
                            body: JSON.stringify({
                                to: pending.email,
                                template: "welcome",
                                variables: {
                                    userName: userName,
                                    planName: pending.plan_slug,
                                },
                            }),
                        });

                        if (emailResponse.ok) {
                            console.log("Welcome email sent to:", pending.email);
                        } else {
                            const emailError = await emailResponse.text();
                            console.error("Failed to send welcome email:", emailError);
                        }
                    } catch (emailErr) {
                        console.error("Error sending welcome email:", emailErr);
                    }

                    // Delete pending signup
                    await supabase.from("pending_signups").delete().eq("id", pendingSignupId);
                    console.log("Pending signup deleted");
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const priceId = subscription.items?.data?.[0]?.price?.id;

                // Look up plan by Stripe price ID
                let plan = "free";
                if (priceId) {
                    // Try monthly price ID
                    let { data: planData } = await supabase
                        .from("payment_plans")
                        .select("slug")
                        .eq("stripe_price_id_monthly", priceId)
                        .single();

                    // Try yearly price ID
                    if (!planData) {
                        const { data: yearlyPlan } = await supabase
                            .from("payment_plans")
                            .select("slug")
                            .eq("stripe_price_id_yearly", priceId)
                            .single();
                        planData = yearlyPlan;
                    }

                    if (planData) {
                        plan = planData.slug;
                    } else {
                        console.warn("Unknown Stripe price ID:", priceId);
                    }
                }

                // Map Stripe status
                const mappedStatus =
                    subscription.status === "active" || subscription.status === "trialing" ? subscription.status :
                        subscription.status === "past_due" ? "past_due" :
                            subscription.status === "canceled" || subscription.status === "unpaid" ? "canceled" : "active";

                const updateData: Record<string, unknown> = {
                    plan,
                    status: mappedStatus,
                    stripe_price_id: priceId || null,
                    updated_at: new Date().toISOString(),
                };

                // Only add period dates if they exist
                if (subscription.current_period_start) {
                    updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
                }
                if (subscription.current_period_end) {
                    updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
                }

                await supabase
                    .from("subscriptions")
                    .update(updateData)
                    .eq("stripe_customer_id", customerId);

                console.log("Subscription updated - Plan:", plan, "Status:", mappedStatus);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await supabase
                    .from("subscriptions")
                    .update({ status: "canceled" })
                    .eq("stripe_customer_id", customerId);
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await supabase
                    .from("subscriptions")
                    .update({ status: "past_due" })
                    .eq("stripe_customer_id", customerId);

                // Get user email from subscription
                const { data: subData } = await supabase
                    .from("subscriptions")
                    .select("brand_id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (subData?.brand_id) {
                    // Get brand owner email
                    const { data: brand } = await supabase
                        .from("brands")
                        .select("owner_id")
                        .eq("id", subData.brand_id)
                        .single();

                    if (brand?.owner_id) {
                        const { data: ownerProfile } = await supabase
                            .from("profiles")
                            .select("email, full_name")
                            .eq("id", brand.owner_id)
                            .single();

                        if (ownerProfile?.email) {
                            // Send payment failed email
                            try {
                                const amount = invoice.amount_due
                                    ? `$${(invoice.amount_due / 100).toFixed(2)}`
                                    : "your subscription";
                                const updatePaymentUrl = `${Deno.env.get("SITE_URL") || supabaseUrl}/dashboard/billing`;

                                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${supabaseServiceKey}`,
                                        "apikey": supabaseServiceKey,
                                    },
                                    body: JSON.stringify({
                                        to: ownerProfile.email,
                                        template: "payment_failed",
                                        variables: {
                                            userName: ownerProfile.full_name || ownerProfile.email.split("@")[0],
                                            amount: amount,
                                            updatePaymentUrl: updatePaymentUrl,
                                        },
                                    }),
                                });
                                console.log("Payment failed email sent to:", ownerProfile.email);
                            } catch (emailErr) {
                                console.error("Failed to send payment failed email:", emailErr);
                            }
                        }
                    }
                }
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Webhook error:", err);
        return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }
});
