import { Link, Outlet } from "react-router-dom";
import { marketingNav } from "@/config/site";
import { Button } from "@/components/ui";
import { SiteLogo } from "@/components/site-logo";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container-xl flex h-16 items-center justify-between">
                {/* Logo */}
                <SiteLogo size="md" />

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {marketingNav.map((item) => (
                        <Link
                            key={item.href}
                            to={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* CTA Buttons */}
                <div className="flex items-center gap-3">
                    <Link to="/login">
                        <Button variant="ghost" size="sm">
                            Sign in
                        </Button>
                    </Link>
                    <Link to="/signup">
                        <Button size="sm">Get Started →</Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}

function Footer() {
    const { settings } = useSiteSettings();

    return (
        <footer className="border-t border-border bg-muted py-12">
            <div className="container-xl text-center">
                <div className="mb-4 flex justify-center">
                    <SiteLogo size="sm" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    {settings.tagline}
                </p>
                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} {settings.company_name}. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

export default function MarketingLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
