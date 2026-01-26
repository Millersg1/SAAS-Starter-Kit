import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

interface SiteLogoProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    href?: string;
}

/**
 * Site logo component - displays company name as text, or logo image if uploaded.
 * When no logo is uploaded, only displays text (no icon placeholder).
 */
export function SiteLogo({ size = "md", className, href = "/" }: SiteLogoProps) {
    const { settings } = useSiteSettings();

    const sizes = {
        sm: { logo: "h-6", text: "text-lg" },
        md: { logo: "h-8", text: "text-xl" },
        lg: { logo: "h-10", text: "text-2xl" },
    };

    const content = (
        <div className={cn("flex items-center gap-2 font-bold", sizes[size].text, className)}>
            {settings.logo_url ? (
                <img
                    src={settings.logo_url}
                    alt={settings.company_name}
                    className={cn(sizes[size].logo, "object-contain")}
                />
            ) : (
                <span className="text-foreground">{settings.company_name}</span>
            )}
        </div>
    );

    if (href) {
        return <Link to={href}>{content}</Link>;
    }

    return content;
}
