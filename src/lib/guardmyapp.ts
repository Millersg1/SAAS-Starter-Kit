/**
 * GuardMyApp API Client (Proxied through Edge Function)
 * Security scanning for URLs and GitHub repositories
 * API key is kept secure on the server
 * 
 * @see https://guardmyapp.com/developers/docs
 */

// Get Supabase URL for Edge Function calls
function getSupabaseUrl(): string {
    return import.meta.env.VITE_SUPABASE_URL || "";
}

// ============================================
// Types
// ============================================

export interface GMAFinding {
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    evidence?: string;
    file_path?: string;
    remediation: string;
}

export interface GMASummary {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

export interface GMAUrlScanResult {
    scan_id: string;
    scan_type: "url";
    target_url: string;
    status: "pending" | "running" | "completed" | "error";
    findings: GMAFinding[];
    summary: GMASummary;
    websocket_url?: string;
    vibe_platform?: string;
    is_vibe_coded?: boolean;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
}

export interface GMARepoScanResult {
    scan_id: number;
    scan_type: "repo";
    repo_full_name: string;
    status: "pending" | "running" | "completed" | "failed";
    total_files_scanned?: number;
    findings: GMAFinding[];
    summary: GMASummary;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
}

export interface GMARepository {
    full_name: string;
    name: string;
    private: boolean;
    description?: string;
    language?: string;
    updated_at: string;
}

export interface GMAUsage {
    usage_this_month: number;
    monthly_limit: number;
    remaining: number;
    total_requests: number;
    last_request_at?: string;
    plan_interval: "month" | "year";
}

export interface GMAError {
    detail: string;
    status: number;
}

// ============================================
// API Client (via Edge Function)
// ============================================

async function callEdgeFunction(action: string, params: Record<string, unknown> = {}): Promise<Response> {
    const supabaseUrl = getSupabaseUrl();
    return fetch(`${supabaseUrl}/functions/v1/security-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
    });
}

/**
 * Check if GMA is configured (API key exists on server)
 */
export async function isGMAConfigured(): Promise<boolean> {
    try {
        const response = await callEdgeFunction("check-configured");
        const data = await response.json();
        return data.configured === true;
    } catch {
        return false;
    }
}

/**
 * Start a URL scan (FREE - works with or without API key)
 */
export async function startUrlScan(url: string, force: boolean = true): Promise<{ scan_id?: string; websocket_url?: string; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("start-url-scan", { url, force });
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to start scan", status: response.status } };
        }

        return { scan_id: data.scan_id, websocket_url: data.websocket_url };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * Get URL scan results
 */
export async function getUrlScanResult(scanId: string): Promise<{ data?: GMAUrlScanResult; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("get-url-scan", { scanId });
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to get scan", status: response.status } };
        }

        return { data };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * Start a repository scan (PAID - requires API key)
 */
export async function startRepoScan(repoFullName: string): Promise<{ scan_id?: number; websocket_url?: string; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("start-repo-scan", { repoFullName });
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to start repo scan", status: response.status } };
        }

        return { scan_id: data.scan_id, websocket_url: data.websocket_url };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * Get repository scan results
 */
export async function getRepoScanResult(scanId: number): Promise<{ data?: GMARepoScanResult; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("get-repo-scan", { scanId });
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to get repo scan", status: response.status } };
        }

        return { data };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * List connected GitHub repositories
 */
export async function listRepositories(): Promise<{ data?: { github_username: string; repos: GMARepository[] }; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("list-repos");
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to list repos", status: response.status } };
        }

        return { data };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * Get current usage and limits
 */
export async function getUsage(): Promise<{ data?: GMAUsage; error?: GMAError }> {
    try {
        const response = await callEdgeFunction("get-usage");
        const data = await response.json();

        if (!response.ok) {
            return { error: { detail: data.error || data.detail || "Failed to get usage", status: response.status } };
        }

        return { data };
    } catch (error) {
        return { error: { detail: (error as Error).message, status: 0 } };
    }
}

/**
 * Helper to poll for URL scan completion
 */
export async function pollForUrlScanCompletion(
    scanId: string,
    maxAttempts = 30,
    intervalMs = 2000
): Promise<{ data?: GMAUrlScanResult; error?: GMAError }> {
    for (let i = 0; i < maxAttempts; i++) {
        const result = await getUrlScanResult(scanId);

        if (result.error) {
            return result;
        }

        if (result.data?.status === "completed" || result.data?.status === "error") {
            return result;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return { error: { detail: "Scan timed out", status: 408 } };
}

/**
 * Helper to poll for repo scan completion
 */
export async function pollForRepoScanCompletion(
    scanId: number,
    maxAttempts = 30,
    intervalMs = 3000
): Promise<{ data?: GMARepoScanResult; error?: GMAError }> {
    for (let i = 0; i < maxAttempts; i++) {
        const result = await getRepoScanResult(scanId);

        if (result.error) {
            return result;
        }

        if (result.data?.status === "completed" || result.data?.status === "failed") {
            return result;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return { error: { detail: "Scan timed out", status: 408 } };
}
