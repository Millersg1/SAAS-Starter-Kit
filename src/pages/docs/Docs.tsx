import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function DocsIndex() {
    const { settings } = useSiteSettings();
    const supportEmail = settings.support_email || "support@example.com";

    return (
        <div className="prose prose-lg max-w-none">
            <h1>Getting Started</h1>
            <p className="lead">
                Everything you need to know to get up and running. Learn how to manage your profile, collaborate with your team, and handle billing.
            </p>

            {/* Quick links */}
            <div className="grid md:grid-cols-3 gap-4 not-prose my-8">
                <Link to="/docs/profile">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <h3 className="font-semibold text-foreground">Edit Profile</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Update your name, email, and account settings.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/docs/team">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <h3 className="font-semibold text-foreground">Team Management</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Invite members and manage team roles.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <Link to="/docs/billing">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <h3 className="font-semibold text-foreground">Billing & Plans</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Manage your subscription and payment methods.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <h2>Quick Overview</h2>

            <h3>Dashboard</h3>
            <p>
                Your <Link to="/dashboard">dashboard</Link> provides an overview of your account activity. Access all features from the sidebar navigation.
            </p>

            <h3>Getting Help</h3>
            <p>
                Need assistance? Check our <Link to="/docs/faq">FAQ</Link> or contact support at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
        </div>
    );
}
