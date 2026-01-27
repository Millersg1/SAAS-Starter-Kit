import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GMA_BASE_URL = "https://api.guardmyapp.com";
const GMA_API_KEY = Deno.env.get("GUARDMYAPP_API_KEY");

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
        const { action, url, scanId, repoFullName, force } = await req.json();

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        // Add API key if configured (required for repo scans, optional for URL scans)
        if (GMA_API_KEY) {
            headers["X-API-Key"] = GMA_API_KEY;
        }

        let response: Response;

        switch (action) {
            case "start-url-scan":
                response = await fetch(`${GMA_BASE_URL}/v1/scan/url`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ url, force: force ?? true }),
                });
                break;

            case "get-url-scan":
                response = await fetch(`${GMA_BASE_URL}/v1/scan/url/${scanId}`, {
                    method: "GET",
                    headers,
                });
                break;

            case "start-repo-scan":
                if (!GMA_API_KEY) {
                    return new Response(
                        JSON.stringify({ error: "GuardMyApp API key not configured" }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
                response = await fetch(`${GMA_BASE_URL}/v1/scan/repo`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ repo_full_name: repoFullName }),
                });
                break;

            case "get-repo-scan":
                response = await fetch(`${GMA_BASE_URL}/v1/scan/repo/${scanId}`, {
                    method: "GET",
                    headers,
                });
                break;

            case "list-repos":
                response = await fetch(`${GMA_BASE_URL}/v1/repos`, {
                    method: "GET",
                    headers,
                });
                break;

            case "get-usage":
                response = await fetch(`${GMA_BASE_URL}/v1/usage`, {
                    method: "GET",
                    headers,
                });
                break;

            case "check-configured":
                return new Response(
                    JSON.stringify({ configured: !!GMA_API_KEY }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );

            default:
                return new Response(
                    JSON.stringify({ error: "Unknown action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }

        const data = await response.json();

        // If the response is an error, enhance the error message
        if (!response.ok) {
            const errorMessage = data.detail || data.error || data.message || `API error: ${response.status}`;
            return new Response(
                JSON.stringify({ error: errorMessage, status: response.status }),
                {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        return new Response(
            JSON.stringify(data),
            {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    } catch (err) {
        console.error("Security scan error:", err);
        const errorMessage = (err as Error).message || "Unknown error occurred";
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
