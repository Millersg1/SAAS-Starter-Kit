import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
    email: string;
    brandId: number;
    role?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Verify user is authenticated
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get the user from the JWT
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { email, brandId, role = "editor" }: InviteRequest = await req.json();

        if (!email || !brandId) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: email and brandId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get user's profile to check if they're admin of the brand
        const { data: membership, error: memberError } = await supabase
            .from("brand_members")
            .select("role")
            .eq("brand_id", brandId)
            .eq("user_id", user.id)
            .single();

        if (memberError || !membership || membership.role !== "admin") {
            return new Response(
                JSON.stringify({ error: "Only brand admins can invite members" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if user can invite more members (plan limits)
        const { data: canInvite } = await supabase
            .rpc("can_invite_member", { p_brand_id: brandId });

        if (!canInvite) {
            return new Response(
                JSON.stringify({ error: "Member limit reached. Please upgrade your plan." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if email is already a member or has pending invite
        const { data: existingMember } = await supabase
            .from("brand_members")
            .select("id, invited_email, user_id")
            .eq("brand_id", brandId)
            .or(`invited_email.eq.${email}`)
            .maybeSingle();

        if (existingMember) {
            return new Response(
                JSON.stringify({ error: "This email already has a pending invite or is a member" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if user with this email already exists
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingProfile) {
            // Check if already a member
            const { data: existingMembership } = await supabase
                .from("brand_members")
                .select("id")
                .eq("brand_id", brandId)
                .eq("user_id", existingProfile.id)
                .maybeSingle();

            if (existingMembership) {
                return new Response(
                    JSON.stringify({ error: "This user is already a member of the brand" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Get brand name and inviter name
        const { data: brand } = await supabase
            .from("brands")
            .select("name")
            .eq("id", brandId)
            .single();

        const { data: inviterProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .single();

        // Create pending invite
        const { error: insertError } = await supabase
            .from("brand_members")
            .insert({
                brand_id: brandId,
                user_id: existingProfile?.id || null,
                role: role,
                invited_email: email,
                invited_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error("Insert error:", insertError);
            return new Response(
                JSON.stringify({ error: "Failed to create invitation" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Generate invite URL
        const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", "");
        const inviteUrl = `${siteUrl}/auth/accept-invite?email=${encodeURIComponent(email)}&brand=${brandId}`;

        // Send invite email using database template
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "apikey": supabaseServiceKey,
            },
            body: JSON.stringify({
                to: email,
                template: "brand_invite",
                variables: {
                    brandName: brand?.name || "the team",
                    inviterName: inviterProfile?.full_name || inviterProfile?.email || "Someone",
                    inviteUrl: inviteUrl,
                },
            }),
        });

        if (!emailResponse.ok) {
            const emailError = await emailResponse.text();
            console.error("Failed to send invite email:", emailError);
            // Don't fail the invite, just log the error
        } else {
            console.log("Invite email sent to:", email);
        }

        return new Response(
            JSON.stringify({ success: true, message: "Invitation sent" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Invite error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
