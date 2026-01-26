import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

/**
 * Component that dynamically updates the favicon based on site settings.
 * Falls back to /favicon.ico if no custom favicon is set.
 * This component should be rendered once in App.tsx.
 */
export function DynamicFavicon() {
    const { settings } = useSiteSettings();

    useEffect(() => {
        // Find existing favicon links or create new ones
        let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
        let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");

        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }

        if (!appleLink) {
            appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            document.head.appendChild(appleLink);
        }

        // Set the favicon URL (custom or default)
        // Add cache busting to force browser to reload
        const faviconUrl = settings.favicon_url || "/favicon.ico";
        const cacheBust = settings.favicon_url ? `?t=${Date.now()}` : "";

        link.href = faviconUrl + cacheBust;
        appleLink.href = faviconUrl + cacheBust;
    }, [settings.favicon_url]);

    return null;
}
