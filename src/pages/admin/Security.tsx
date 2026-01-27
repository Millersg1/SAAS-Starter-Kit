import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from "@/components/ui";
import {
    isGMAConfigured,
    startUrlScan,
    listRepositories,
    startRepoScan,
    getRepoScanResult,
    getUsage,
    GMAFinding,
    GMASummary,
    GMARepository,
    GMAUsage
} from "@/lib/guardmyapp";
import { useToast } from "@/hooks/use-toast";

const GMA_WS_BASE = "wss://api.guardmyapp.com";

// Types
interface ScanResult {
    scan_id: string | number;
    status: string;
    target_url?: string;
    findings: GMAFinding[];
    summary: GMASummary;
}

// Setup Card for when GMA API key not configured
function SetupCard() {
    return (
        <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <CardTitle className="text-xl">Unlock Repository Scanning</CardTitle>
                        <CardDescription>Deep scan your code for security vulnerabilities</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-semibold">URL Scanning</span>
                            <Badge className="bg-green-500 text-white text-xs">FREE</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                            Already available below! Scan any deployed website for exposed API keys and secrets.
                        </p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <span className="font-semibold">Repository Scanning</span>
                            <Badge className="bg-blue-500 text-white text-xs">PRO</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                            Deep scan GitHub repositories for exposed secrets, credentials, and sensitive data.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t">
                    <div className="flex-1 text-center sm:text-left">
                        <p className="font-medium">Get Started in 2 Minutes</p>
                        <p className="text-sm text-slate-600">
                            Sign up at GuardMyApp, get your API key, and add it to your environment variables.
                        </p>
                    </div>
                    <a
                        href="https://guardmyapp.com/github-pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        style={{ color: 'white' }}
                    >
                        Get Your API Key
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800">
                        <strong>How to configure:</strong> Set your API key as a Supabase Edge Function secret:{' '}
                        <code className="px-1 rounded bg-amber-100 text-amber-900">
                            npx supabase secrets set GUARDMYAPP_API_KEY=your_key_here
                        </code>{' '}
                        then redeploy the security-scan function.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

// Scan Results Display with risk score
function ScanResultsDisplay({ result }: { result: ScanResult }) {
    const findings = result.findings || [];
    const summary = result.summary || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const totalIssues = findings.length || (summary.critical + summary.high + summary.medium + summary.low + summary.info);
    const highPriority = summary.critical + summary.high;

    // Calculate risk score (0-100)
    const riskScore = Math.min(100, Math.round(
        (summary.critical * 25 + summary.high * 15 + summary.medium * 8 + summary.low * 3 + summary.info * 1)
    ));

    const getRiskColor = (score: number) => {
        if (score >= 50) return 'text-red-600';
        if (score >= 25) return 'text-orange-500';
        if (score > 0) return 'text-yellow-500';
        return 'text-green-500';
    };

    const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
        critical: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' },
        high: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },
        medium: { bg: 'bg-yellow-500', text: 'text-black', border: 'border-yellow-500' },
        low: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' },
        info: { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500' },
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 border text-center">
                    <div className={`text-4xl font-bold mb-1 ${getRiskColor(riskScore)}`}>
                        {riskScore}%
                    </div>
                    <div className="text-sm text-slate-500 uppercase tracking-wide">Risk Score</div>
                </div>
                <div className="bg-white rounded-xl p-6 border text-center">
                    <div className={`text-4xl font-bold mb-1 ${highPriority > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                        {highPriority}
                    </div>
                    <div className="text-sm text-slate-500 uppercase tracking-wide">High Priority</div>
                </div>
                <div className="bg-white rounded-xl p-6 border text-center">
                    <div className="text-4xl font-bold mb-1">{totalIssues}</div>
                    <div className="text-sm text-slate-500 uppercase tracking-wide">Total Issues</div>
                </div>
            </div>

            {/* Severity Badges */}
            {totalIssues > 0 && (
                <div className="flex flex-wrap justify-center gap-3">
                    {summary.critical > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-500 text-white text-sm font-semibold">
                            {summary.critical} Critical
                        </span>
                    )}
                    {summary.high > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold">
                            {summary.high} High
                        </span>
                    )}
                    {summary.medium > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-500 text-black text-sm font-semibold">
                            {summary.medium} Medium
                        </span>
                    )}
                    {summary.low > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-semibold">
                            {summary.low} Low
                        </span>
                    )}
                    {summary.info > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-500 text-white text-sm font-semibold">
                            {summary.info} Info
                        </span>
                    )}
                </div>
            )}

            {/* No Issues State */}
            {totalIssues === 0 && (
                <div className="text-center py-16 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-6xl mb-4">🛡️</div>
                    <h3 className="text-2xl font-bold text-green-600">No Vulnerabilities Found</h3>
                    <p className="text-slate-600 mt-2">Your application passed all security checks.</p>
                </div>
            )}

            {/* Findings List */}
            {totalIssues > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Security Issues ({totalIssues})</h3>

                    {findings.map((finding, index) => {
                        const styles = severityStyles[finding.severity] || severityStyles.info;

                        return (
                            <div key={index} className={`bg-white rounded-lg border-l-4 ${styles.border} shadow-sm overflow-hidden`}>
                                <div className="p-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${styles.bg} ${styles.text}`}>
                                            {finding.severity}
                                        </span>
                                        <h4 className="font-semibold">{finding.title}</h4>
                                    </div>
                                </div>
                                <div className="p-4 space-y-4">
                                    <p className="text-sm text-slate-600">{finding.description}</p>

                                    {finding.evidence && (
                                        <div className="bg-slate-50 rounded-lg p-4">
                                            <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Evidence</h5>
                                            <code className="text-sm text-red-600 font-mono break-all block">
                                                {finding.evidence}
                                            </code>
                                        </div>
                                    )}

                                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <h5 className="text-sm font-semibold text-green-700 uppercase">How to Fix</h5>
                                        </div>
                                        <p className="text-sm">{finding.remediation}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// URL Scanner with WebSocket support
function UrlScanner() {
    const [url, setUrl] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<string>("");
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const { toast } = useToast();

    async function startScanWithWebSocket(targetUrl: string): Promise<ScanResult> {
        const { scan_id, websocket_url, error } = await startUrlScan(targetUrl, true);

        if (error) {
            throw new Error(error.detail || "Failed to start scan");
        }

        if (!scan_id) {
            throw new Error("No scan ID returned from API");
        }

        setScanStatus("Connecting to scanner...");

        // Connect to WebSocket for real-time updates
        const wsUrl = `${GMA_WS_BASE}${websocket_url}`;

        return new Promise<ScanResult>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("Scan timed out after 60 seconds"));
            }, 60000);

            const allFindings: GMAFinding[] = [];

            ws.onopen = () => {
                setScanStatus("Connected. Analyzing target...");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case "started":
                        case "detection_started":
                            setScanStatus("Detecting application type...");
                            break;
                        case "vibe_detection":
                            setScanStatus(`Analyzing: ${data.message || "Checking platform..."}`);
                            break;
                        case "scanner_started":
                            setScanStatus(`Running ${data.name || "security scanners"}...`);
                            break;
                        case "scanner_completed":
                            if (data.findings && Array.isArray(data.findings)) {
                                allFindings.push(...data.findings);
                            }
                            setScanStatus(`Scanning... ${allFindings.length} findings so far...`);
                            break;
                        case "completed":
                            clearTimeout(timeout);
                            ws.close();
                            resolve({
                                ...data,
                                findings: allFindings.length > 0 ? allFindings : (data.findings || []),
                            });
                            return;
                        case "error":
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(data.error_message || data.message || "Scan failed"));
                            return;
                    }

                    if (data.status === "completed") {
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            ...data,
                            findings: allFindings.length > 0 ? allFindings : (data.findings || []),
                        });
                    } else if (data.status === "error") {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(data.error_message || "Scan failed"));
                    }
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                ws.close();
                reject(new Error("WebSocket connection failed"));
            };

            ws.onclose = () => {
                clearTimeout(timeout);
            };
        });
    }

    async function handleScan() {
        if (!url.trim()) {
            toast({ title: "Please enter a URL to scan", variant: "destructive" });
            return;
        }

        setIsScanning(true);
        setScanResult(null);
        setScanStatus("Starting scan...");

        try {
            const result = await startScanWithWebSocket(url.trim());
            setScanResult(result);
            setScanStatus("");
            toast({ title: "Scan completed!" });
        } catch (error) {
            toast({ title: (error as Error).message, variant: "destructive" });
            setScanStatus("");
        } finally {
            setIsScanning(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>URL Scanner</CardTitle>
                        <Badge className="bg-green-500 text-white text-xs">FREE</Badge>
                    </div>
                </div>
                <CardDescription>
                    Scan any deployed website for exposed secrets and security vulnerabilities
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            placeholder="https://your-app.vercel.app"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isScanning}
                        />
                    </div>
                    <Button onClick={handleScan} isLoading={isScanning}>
                        {isScanning ? "Scanning..." : "Scan URL"}
                    </Button>
                </div>

                {isScanning && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{scanStatus || "Starting scan..."}</span>
                    </div>
                )}

                {scanResult && (
                    <div className="pt-6">
                        <ScanResultsDisplay result={scanResult} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminSecurity() {
    const [gmaConfigured, setGmaConfigured] = useState(false);

    useEffect(() => {
        isGMAConfigured().then(setGmaConfigured);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Security</h1>
                <p className="text-slate-600">Security scanning and monitoring powered by GuardMyApp</p>
            </div>

            {/* URL Scanner */}
            <UrlScanner />

            {/* Setup Card for Repo Scanning (only if not configured) */}
            {!gmaConfigured && <SetupCard />}

            {/* Repository Scanner (only when configured) */}
            {gmaConfigured && <RepoScanner />}
        </div>
    );
}

// ============================================
// Repository Scanner Component
// ============================================

interface RepoScanResult {
    scan_id: string | number;
    status: string;
    repo_full_name?: string;
    total_files_scanned?: number;
    findings: GMAFinding[];
    summary: GMASummary;
}

function RepoScanner() {
    const [repos, setRepos] = useState<GMARepository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState("");
    const [isLoadingRepos, setIsLoadingRepos] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState("");
    const [scanResult, setScanResult] = useState<RepoScanResult | null>(null);
    const [requiresGithub, setRequiresGithub] = useState(false);
    const [hasSubscription, setHasSubscription] = useState(true);
    const [usage, setUsage] = useState<GMAUsage | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadReposAndUsage();
    }, []);

    async function loadReposAndUsage() {
        setIsLoadingRepos(true);
        try {
            // Load usage first to check subscription
            const usageResult = await getUsage();
            if (usageResult.data) {
                setUsage(usageResult.data);
                setHasSubscription(true);
            } else if (usageResult.error?.status === 403) {
                setHasSubscription(false);
                setIsLoadingRepos(false);
                return;
            }

            // Load repos
            const reposResult = await listRepositories();
            if (reposResult.error) {
                if (reposResult.error.detail.includes("GitHub")) {
                    setRequiresGithub(true);
                } else {
                    console.error("Failed to load repos:", reposResult.error);
                }
            } else if (reposResult.data?.repos) {
                setRepos(reposResult.data.repos);
            }
        } catch (error) {
            console.error("Failed to load repos:", error);
        } finally {
            setIsLoadingRepos(false);
        }
    }

    async function pollForResult(scanId: number): Promise<RepoScanResult> {
        const maxAttempts = 40;
        const intervalMs = 3000;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            setScanStatus(`Scanning... (${Math.round((i + 1) * intervalMs / 1000)}s)`);

            const result = await getRepoScanResult(scanId);
            if (result.error) {
                throw new Error(result.error.detail);
            }

            if (result.data?.status === "completed") {
                return result.data as RepoScanResult;
            } else if (result.data?.status === "failed") {
                throw new Error(result.data.error_message || "Scan failed");
            }
        }

        throw new Error("Scan timed out. Please try again.");
    }

    async function startScanWithWebSocket(repoFullName: string): Promise<RepoScanResult> {
        const startResult = await startRepoScan(repoFullName);

        if (startResult.error) {
            throw new Error(startResult.error.detail);
        }

        const { scan_id, websocket_url } = startResult;

        if (!scan_id) {
            throw new Error("No scan ID returned from API");
        }

        // If no websocket_url, fall back to polling
        if (!websocket_url) {
            setScanStatus("Scanning repository...");
            return pollForResult(scan_id);
        }

        setScanStatus("Connecting to scanner...");

        const wsUrl = `${GMA_WS_BASE}${websocket_url}`;

        return new Promise<RepoScanResult>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("Scan timed out after 120 seconds"));
            }, 120000);

            const allFindings: GMAFinding[] = [];

            ws.onopen = () => {
                setScanStatus("Connected. Analyzing repository...");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case "started":
                            setScanStatus("Scan started...");
                            break;
                        case "progress":
                            setScanStatus(data.message || "Scanning...");
                            break;
                        case "scanner_started":
                            setScanStatus(`Running ${data.name || "security scanners"}...`);
                            break;
                        case "scanner_completed":
                            if (data.findings && Array.isArray(data.findings)) {
                                allFindings.push(...data.findings);
                            }
                            setScanStatus(`Scanning... ${allFindings.length} findings so far...`);
                            break;
                        case "completed":
                            clearTimeout(timeout);
                            ws.close();
                            resolve({
                                ...data,
                                findings: allFindings.length > 0 ? allFindings : (data.findings || []),
                            });
                            return;
                        case "error":
                            clearTimeout(timeout);
                            ws.close();
                            reject(new Error(data.error_message || data.message || "Scan failed"));
                            return;
                    }

                    if (data.status === "completed") {
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            ...data,
                            findings: allFindings.length > 0 ? allFindings : (data.findings || []),
                        });
                    } else if (data.status === "failed") {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error(data.error_message || "Scan failed"));
                    }
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                ws.close();
                reject(new Error("WebSocket connection failed"));
            };

            ws.onclose = () => {
                clearTimeout(timeout);
            };
        });
    }

    async function handleScan() {
        if (!selectedRepo) {
            toast({ title: "Please select a repository", variant: "destructive" });
            return;
        }

        setIsScanning(true);
        setScanResult(null);
        setScanStatus("Starting scan...");

        try {
            const result = await startScanWithWebSocket(selectedRepo);
            setScanResult(result);
            setScanStatus("");
            toast({ title: "Repository scan completed!" });
        } catch (error) {
            toast({ title: (error as Error).message, variant: "destructive" });
            setScanStatus("");
        } finally {
            setIsScanning(false);
        }
    }

    // Not subscribed - show upgrade prompt
    if (!hasSubscription) {
        return (
            <Card className="border-dashed">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle>Repository Scanner</CardTitle>
                        <Badge className="bg-blue-500 text-white text-xs">PRO</Badge>
                    </div>
                    <CardDescription>
                        Deep scan GitHub repositories for exposed secrets and credentials
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Unlock Repository Scanning</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Upgrade to scan your GitHub repositories for exposed secrets, API keys, and credentials.
                        </p>
                        <a
                            href="https://guardmyapp.com/github-pro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            style={{ color: 'white' }}
                        >
                            Upgrade Now - $7/month
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // GitHub not connected
    if (requiresGithub) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle>Repository Scanner</CardTitle>
                        <Badge className="bg-blue-500 text-white text-xs">PRO</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Connect GitHub</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Connect your GitHub account to scan repositories for security issues.
                        </p>
                        <a
                            href="https://guardmyapp.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                            style={{ color: 'white' }}
                        >
                            Connect GitHub
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>Repository Scanner</CardTitle>
                        <Badge className="bg-blue-500 text-white text-xs">PRO</Badge>
                    </div>
                    {usage && (
                        <div className="text-sm text-slate-500">
                            <span className="font-medium">{usage.remaining}</span> of {usage.monthly_limit} scans remaining
                        </div>
                    )}
                </div>
                <CardDescription>
                    Scan your GitHub repositories for exposed secrets and credentials
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoadingRepos ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Loading repositories...</span>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <select
                                value={selectedRepo}
                                onChange={(e) => setSelectedRepo(e.target.value)}
                                disabled={isScanning}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a repository...</option>
                                {repos.map((repo) => (
                                    <option key={repo.full_name} value={repo.full_name}>
                                        {repo.full_name} {repo.private ? "🔒" : ""} {repo.language ? `(${repo.language})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleScan} isLoading={isScanning} disabled={!selectedRepo || usage?.remaining === 0}>
                            {isScanning ? "Scanning..." : "Scan Repo"}
                        </Button>
                    </div>
                )}

                {usage?.remaining === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                            You've used all your scans this month. Your limit resets at the start of each billing cycle.
                        </p>
                    </div>
                )}

                {isScanning && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{scanStatus || "Starting scan..."}</span>
                    </div>
                )}

                {scanResult && (
                    <div className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-slate-500">Scanned:</span>
                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">{scanResult.repo_full_name}</code>
                            {scanResult.total_files_scanned && (
                                <span className="text-xs text-slate-400">({scanResult.total_files_scanned} files)</span>
                            )}
                        </div>
                        <ScanResultsDisplay result={scanResult} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
