import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const authHeader = req.headers.get("Authorization")!;

        // Client for auth check
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Admin client for privileged operations
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Verify user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response(
                JSON.stringify({ error: "Admin access required" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { action, userId, newPassword, planSlug } = await req.json();

        if (!userId || !action) {
            return new Response(
                JSON.stringify({ error: "userId and action are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Handle password reset
        if (action === "reset_password") {
            if (!newPassword || newPassword.length < 6) {
                return new Response(
                    JSON.stringify({ error: "Password must be at least 6 characters" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
                password: newPassword,
            });

            if (error) {
                console.error("Error resetting password:", error);
                return new Response(
                    JSON.stringify({ error: "Failed to reset password: " + error.message }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: "Password updated successfully" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Handle plan change
        if (action === "change_plan") {
            if (!planSlug) {
                return new Response(
                    JSON.stringify({ error: "planSlug is required for plan change" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get user's brand
            const { data: userProfile, error: profileError } = await adminSupabase
                .from("profiles")
                .select("current_brand_id")
                .eq("id", userId)
                .single();

            if (profileError) {
                console.error("Error fetching user profile:", profileError);
                return new Response(
                    JSON.stringify({ error: "Failed to fetch user profile: " + profileError.message }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!userProfile?.current_brand_id) {
                return new Response(
                    JSON.stringify({ error: "User does not have a brand. Cannot change plan." }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            console.log("Changing plan for brand:", userProfile.current_brand_id, "to plan:", planSlug);

            // Check if subscription exists for brand - use maybeSingle to avoid error when no rows
            const { data: existingSub, error: subError } = await adminSupabase
                .from("subscriptions")
                .select("id")
                .eq("brand_id", userProfile.current_brand_id)
                .maybeSingle();

            if (subError) {
                console.error("Error checking subscription:", subError);
                return new Response(
                    JSON.stringify({ error: "Failed to check subscription: " + subError.message }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (existingSub) {
                // Update existing subscription
                console.log("Updating existing subscription:", existingSub.id);
                const { error } = await adminSupabase
                    .from("subscriptions")
                    .update({
                        plan: planSlug,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("brand_id", userProfile.current_brand_id);

                if (error) {
                    console.error("Error updating subscription:", error);
                    return new Response(
                        JSON.stringify({ error: "Failed to update plan: " + error.message }),
                        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            } else {
                // Create new subscription for brand
                console.log("Creating new subscription for brand:", userProfile.current_brand_id);
                const { error } = await adminSupabase
                    .from("subscriptions")
                    .insert({
                        brand_id: userProfile.current_brand_id,
                        plan: planSlug,
                        status: "active",
                    });

                if (error) {
                    console.error("Error creating subscription:", error);
                    return new Response(
                        JSON.stringify({ error: "Failed to create subscription: " + error.message }),
                        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }

            return new Response(
                JSON.stringify({ success: true, message: "Plan updated successfully" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Admin users error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
