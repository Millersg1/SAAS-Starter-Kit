import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from "@/components/ui";
import { isGMAConfigured, startUrlScan, GMAFinding, GMASummary } from "@/lib/guardmyapp";
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
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                        Get Your API Key
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800">
                        <strong>How to configure:</strong> Add{' '}
                        <code className="px-1 rounded bg-amber-100 text-amber-900">
                            VITE_GUARDMYAPP_API_KEY=your_key_here
                        </code>{' '}
                        to your{' '}
                        <code className="px-1 rounded bg-amber-100 text-amber-900">.env</code>{' '}
                        file and restart the server.
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
        </div>
    );
}
