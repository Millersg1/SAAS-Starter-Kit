// Site settings - fetches from database with fallback to config
import { supabase } from "@/integrations/supabase/client";
import { siteConfig } from "@/config/site";

export interface SiteSettings {
    company_name: string;
    short_name: string;
    tagline: string;
    support_email: string;
    logo_url: string | null;
    favicon_url: string | null;
    email_domain: string;
    email_from_address: string;
}

// Default settings from config
const defaultSettings: SiteSettings = {
    company_name: siteConfig.companyName,
    short_name: siteConfig.shortName,
    tagline: siteConfig.tagline,
    support_email: siteConfig.supportEmail,
    logo_url: null,
    favicon_url: null,
    email_domain: 'resend.dev',
    email_from_address: 'noreply',
};

// Cache settings on the client side
let cachedSettings: SiteSettings | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Fetch site settings from database
 * Falls back to defaults if unavailable
 */
export async function getSiteSettings(): Promise<SiteSettings> {
    // Return cached settings if still valid
    if (cachedSettings && Date.now() < cacheExpiry) {
        return cachedSettings;
    }

    try {
        // Use 'as any' to bypass TypeScript strict type checking for dynamic table access
        const { data, error } = await (supabase as any)
            .from("site_settings")
            .select("company_name, short_name, tagline, support_email, logo_url, favicon_url, email_domain, email_from_address")
            .eq("id", 1)
            .single();

        if (error || !data) {
            console.warn("Failed to fetch site settings, using defaults");
            return defaultSettings;
        }

        cachedSettings = data as unknown as SiteSettings;
        cacheExpiry = Date.now() + CACHE_TTL;
        return cachedSettings;
    } catch (error) {
        console.warn("Error fetching site settings:", error);
        return defaultSettings;
    }
}

/**
 * Clear the settings cache (call after updating settings)
 */
export function clearSettingsCache() {
    cachedSettings = null;
    cacheExpiry = 0;
}

/**
 * Update site settings
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<{ error?: string }> {
    try {
        console.log("Updating settings:", settings);

        // Use 'as any' to bypass TypeScript strict type checking for dynamic table access
        const { data, error } = await (supabase as any)
            .from("site_settings")
            .update(settings)
            .eq("id", 1)
            .select();

        console.log("Update result:", { data, error });

        if (error) {
            console.error("Update error:", error);
            return { error: error.message };
        }

        // Clear cache so next fetch gets fresh data
        clearSettingsCache();
        return {};
    } catch (error) {
        console.error("Update exception:", error);
        return { error: "Failed to update settings" };
    }
}

/**
 * Upload a file to site-assets bucket
 */
export async function uploadSiteAsset(file: File, path: string): Promise<{ url?: string; error?: string }> {
    try {
        // Upload the file
        const { error: uploadError } = await supabase.storage
            .from("site-assets")
            .upload(path, file, { upsert: true });

        if (uploadError) {
            return { error: uploadError.message };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from("site-assets")
            .getPublicUrl(path);

        return { url: publicUrl };
    } catch (error) {
        return { error: "Failed to upload file" };
    }
}
