import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    // Direct email (to, subject, html)
    to: string;
    subject?: string;
    html?: string;
    from?: string;
    // Template-based email (template, variables)
    template?: string;
    variables?: Record<string, string>;
}

// Replace {{variable}} placeholders in template
function replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] ?? match;
    });
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (!RESEND_API_KEY) {
        return new Response(
            JSON.stringify({ error: "RESEND_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        const { to, subject, html, from, template, variables = {} }: EmailRequest = await req.json();

        if (!to) {
            return new Response(
                JSON.stringify({ error: "Missing required field: to" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let finalSubject = subject;
        let finalHtml = html;

        // If template is specified, load from database
        if (template) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // Get the email template
            const { data: templateData, error: templateError } = await supabase
                .from("email_templates")
                .select("subject, body_html")
                .eq("slug", template)
                .single();

            if (templateError || !templateData) {
                console.error("Template not found:", template, templateError);
                return new Response(
                    JSON.stringify({ error: `Email template '${template}' not found` }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get site settings for default variables
            const { data: siteSettings } = await supabase
                .from("site_settings")
                .select("company_name, support_email")
                .single();

            // Merge site settings into variables
            const allVariables: Record<string, string> = {
                siteName: siteSettings?.company_name || "SSK",
                siteUrl: Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ""),
                supportEmail: siteSettings?.support_email || "support@example.com",
                ...variables,
            };

            // Replace variables in subject and body
            finalSubject = replaceVariables(templateData.subject, allVariables);
            finalHtml = replaceVariables(templateData.body_html, allVariables);
        }

        if (!finalSubject || !finalHtml) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: subject and html (or use template)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get from address from site_settings if not provided
        let fromAddress = from;
        if (!fromAddress) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            const { data: siteSettings } = await supabase
                .from("site_settings")
                .select("company_name, email_from_address, email_domain")
                .single();

            if (siteSettings) {
                const fromName = siteSettings.company_name || "SSK";
                const fromAddr = siteSettings.email_from_address || "noreply";
                const domain = siteSettings.email_domain || "resend.dev";
                fromAddress = `${fromName} <${fromAddr}@${domain}>`;
            } else {
                fromAddress = "SSK <noreply@resend.dev>";
            }
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [to],
                subject: finalSubject,
                html: finalHtml,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to send email");
        }

        console.log("Email sent successfully:", { to, subject: finalSubject, template: template || "direct" });

        return new Response(
            JSON.stringify({ success: true, id: data.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Email error:", err);
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
