import { useState, useEffect } from "react";
import { getSiteSettings, SiteSettings } from "@/lib/settings";
import { siteConfig } from "@/config/site";

const defaultSettings: SiteSettings = {
    company_name: siteConfig.companyName,
    short_name: siteConfig.shortName,
    tagline: siteConfig.tagline,
    support_email: siteConfig.supportEmail,
    logo_url: null,
    favicon_url: null,
    email_domain: "resend.dev",
    email_from_address: "noreply",
};

export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const data = await getSiteSettings();
                setSettings(data);
            } catch (error) {
                console.warn("Failed to fetch site settings:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    return { settings, loading };
}
