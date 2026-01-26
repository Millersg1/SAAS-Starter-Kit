import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSiteSettings, updateSiteSettings, clearSettingsCache, uploadSiteAsset, type SiteSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

export default function AdminSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [companyName, setCompanyName] = useState("");
    const [shortName, setShortName] = useState("");
    const [tagline, setTagline] = useState("");
    const [supportEmail, setSupportEmail] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [faviconUrl, setFaviconUrl] = useState("");
    const [emailDomain, setEmailDomain] = useState("");
    const [emailFromAddress, setEmailFromAddress] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        clearSettingsCache();
        const data = await getSiteSettings();

        // Populate form
        setCompanyName(data.company_name);
        setShortName(data.short_name);
        setTagline(data.tagline || "");
        setSupportEmail(data.support_email || "");
        setLogoUrl(data.logo_url || "");
        setFaviconUrl(data.favicon_url || "");
        setEmailDomain(data.email_domain || "resend.dev");
        setEmailFromAddress(data.email_from_address || "noreply");

        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);

        const result = await updateSiteSettings({
            company_name: companyName,
            short_name: shortName,
            tagline,
            support_email: supportEmail,
            logo_url: logoUrl || null,
            favicon_url: faviconUrl || null,
            email_domain: emailDomain,
            email_from_address: emailFromAddress,
        });

        if (result.error) {
            toast({
                title: "Error",
                description: "Failed to save settings: " + result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Settings saved",
                description: "Your changes have been saved. Refresh the page to see updates.",
            });
        }

        setSaving(false);
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const result = await uploadSiteAsset(file, `logo-${Date.now()}.${file.name.split('.').pop()}`);

        if (result.error) {
            toast({
                title: "Error",
                description: "Failed to upload logo: " + result.error,
                variant: "destructive",
            });
        } else if (result.url) {
            setLogoUrl(result.url);
            toast({
                title: "Logo uploaded",
                description: "Click Save Changes to apply.",
            });
        }
        setUploading(false);
        // Reset input
        if (logoInputRef.current) {
            logoInputRef.current.value = "";
        }
    }

    async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const result = await uploadSiteAsset(file, `favicon-${Date.now()}.${file.name.split('.').pop()}`);

        if (result.error) {
            toast({
                title: "Error",
                description: "Failed to upload favicon: " + result.error,
                variant: "destructive",
            });
        } else if (result.url) {
            setFaviconUrl(result.url);
            toast({
                title: "Favicon uploaded",
                description: "Click Save Changes to apply.",
            });
        }
        setUploading(false);
        // Reset input
        if (faviconInputRef.current) {
            faviconInputRef.current.value = "";
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                    <div className="h-10 w-full bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Configure your site branding and contact info</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            {/* Branding Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>Your company identity across the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input
                                id="company_name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Your Company Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short_name">Short Name</Label>
                            <Input
                                id="short_name"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                                placeholder="SSK"
                            />
                            <p className="text-xs text-muted-foreground">Used in navigation and compact areas</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tagline">Tagline</Label>
                        <Input
                            id="tagline"
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            placeholder="Your catchy tagline"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Contact Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact</CardTitle>
                    <CardDescription>Support contact information</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="support_email">Support Email</Label>
                        <Input
                            id="support_email"
                            type="email"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            placeholder="support@yourcompany.com"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Email Settings</CardTitle>
                    <CardDescription>Configure the sender email for transactional emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Configure the sender email address for all transactional emails (welcome, team invites, billing).
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email_domain">Email Domain</Label>
                            <Input
                                id="email_domain"
                                value={emailDomain}
                                onChange={(e) => setEmailDomain(e.target.value)}
                                placeholder="yourdomain.com"
                            />
                            <p className="text-xs text-muted-foreground">e.g., yourdomain.com or resend.dev</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email_from_address">From Email Address</Label>
                            <Input
                                id="email_from_address"
                                value={emailFromAddress}
                                onChange={(e) => setEmailFromAddress(e.target.value)}
                                placeholder="noreply"
                            />
                            <p className="text-xs text-muted-foreground">Will send as: {emailFromAddress}@{emailDomain}</p>
                        </div>
                    </div>
                    <div className="p-3 bg-muted/50 border border-border rounded-lg">
                        <p className="text-sm">
                            <strong>Preview:</strong> Emails will be sent from{" "}
                            <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono">
                                {companyName || "Your Company"} &lt;{emailFromAddress}@{emailDomain}&gt;
                            </code>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Logo */}
            <Card>
                <CardHeader>
                    <CardTitle>Logo</CardTitle>
                    <CardDescription>Your logo will appear in the header across all pages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Recommended: PNG or SVG, at least 200px wide.
                    </p>

                    {logoUrl && (
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Current:</span>
                            <img src={logoUrl} alt="Logo preview" className="h-12 max-w-[200px] object-contain" />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Logo
                                </>
                            )}
                        </Button>
                        {logoUrl && (
                            <Button
                                variant="ghost"
                                onClick={() => setLogoUrl("")}
                                className="text-muted-foreground"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Remove
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Favicon */}
            <Card>
                <CardHeader>
                    <CardTitle>Favicon</CardTitle>
                    <CardDescription>The favicon appears in browser tabs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Recommended: ICO or PNG, 32x32 or 64x64 pixels.
                    </p>

                    {faviconUrl && (
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Current:</span>
                            <img src={faviconUrl} alt="Favicon preview" className="h-8 w-8 object-contain" />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                            ref={faviconInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFaviconUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            onClick={() => faviconInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Favicon
                                </>
                            )}
                        </Button>
                        {faviconUrl && (
                            <Button
                                variant="ghost"
                                onClick={() => setFaviconUrl("")}
                                className="text-muted-foreground"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Remove
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button at Bottom */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="lg">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
