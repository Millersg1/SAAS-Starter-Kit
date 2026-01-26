// Site-wide configuration
// ⚡ CUSTOMIZE: Update these values to match your brand
export const siteConfig = {
    name: "Your Product Name",
    shortName: "YPN",
    description: "The all-in-one platform to grow your business faster",
    url: import.meta.env.VITE_SITE_URL || "http://localhost:8080",

    // Brand
    tagline: "Everything you need to run your business in one simple place.",

    // Links
    links: {
        github: "https://github.com/yourusername/yourproduct",
        twitter: "https://twitter.com/yourusername",
        discord: "https://discord.gg/yourserver",
    },

    // Contact
    supportEmail: "support@yourdomain.com",

    // Legal
    companyName: "Your Company Name",

    // Social Proof (customize these numbers)
    socialProof: {
        customers: "1,000+",
        rating: "4.9",
        reviews: "500+",
    },
};

// Navigation items for marketing site
export const marketingNav = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/docs", label: "Docs" },
];

// Navigation items for authenticated users (sidebar)
export const dashboardNav = [
    { href: "/dashboard", label: "Overview", icon: "home" },
    { href: "/dashboard/team", label: "Team", icon: "users" },
];

// Bottom navigation item for dashboard (Help & Support)
export const dashboardBottomNav = [
    { href: "/dashboard/support", label: "Help & Support", icon: "support" },
];

// Navigation items for admin users
export const adminNav = [
    { href: "/admin", label: "Analytics", icon: "chart" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/payment-plans", label: "Payment Plans", icon: "credit-card" },
    { href: "/admin/emails", label: "Emails", icon: "mail" },
    { href: "/admin/security", label: "Security", icon: "shield" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
    { href: "/admin/support", label: "Help & Support", icon: "support" },
];
