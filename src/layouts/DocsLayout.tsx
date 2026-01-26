import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/site-logo";

// Documentation navigation structure with searchable content
const docsNav = [
    {
        title: "Getting Started",
        items: [
            {
                href: "/docs",
                label: "Welcome",
                keywords: ["dashboard", "overview", "guide", "start", "introduction"]
            },
        ],
    },
    {
        title: "Features",
        items: [
            {
                href: "/docs/profile",
                label: "Edit Profile",
                keywords: ["profile", "settings", "name", "email", "password", "account", "update"]
            },
            {
                href: "/docs/team",
                label: "Team Management",
                keywords: ["team", "invite", "members", "roles", "admin", "editor", "remove", "collaboration"]
            },
            {
                href: "/docs/billing",
                label: "Billing & Plans",
                keywords: ["billing", "subscription", "payment", "upgrade", "plan", "pricing", "cancel", "invoice"]
            },
        ],
    },
    {
        title: "Help",
        items: [
            {
                href: "/docs/faq",
                label: "FAQ",
                keywords: ["faq", "help", "support", "questions", "answers", "troubleshooting"]
            },
        ],
    },
];

// Flatten docs for search
const allDocs = docsNav.flatMap(section =>
    section.items.map(item => ({
        ...item,
        section: section.title
    }))
);

function Sidebar() {
    const location = useLocation();

    return (
        <aside className="hidden lg:block w-56 flex-shrink-0">
            <nav className="sticky top-20 space-y-6">
                {docsNav.map((section) => (
                    <div key={section.title}>
                        <h4 className="font-semibold text-xs uppercase tracking-wider mb-2 text-slate-500">{section.title}</h4>
                        <ul className="space-y-0.5">
                            {section.items.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        to={item.href}
                                        className={cn(
                                            "block px-2 py-1.5 rounded text-sm transition-colors",
                                            location.pathname === item.href
                                                ? "text-blue-600 font-medium bg-blue-50"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}

// Search Modal component
function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");

    // Filter docs based on search query
    const searchResults = useMemo(() => {
        if (!query.trim()) return [];

        const searchTerm = query.toLowerCase();
        return allDocs.filter(doc =>
            doc.label.toLowerCase().includes(searchTerm) ||
            doc.keywords.some(keyword => keyword.includes(searchTerm)) ||
            doc.section.toLowerCase().includes(searchTerm)
        );
    }, [query]);

    // Reset query when modal closes
    useEffect(() => {
        if (!isOpen) {
            setQuery("");
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            {/* Dark backdrop overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur"
                onClick={onClose}
            />
            {/* Modal container */}
            <div className="relative flex items-start justify-center pt-[15vh] px-4">
                <div
                    className="w-full max-w-lg bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 px-4 border-b border-border">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search documentation..."
                            className="flex-1 py-4 bg-transparent outline-none border-none text-lg text-foreground placeholder:text-muted-foreground"
                            autoFocus
                        />
                        <button
                            onClick={onClose}
                            className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hover:bg-border transition-colors"
                        >
                            ESC
                        </button>
                    </div>

                    {/* Search Results */}
                    <div className="max-h-80 overflow-y-auto">
                        {query.trim() === "" ? (
                            <div className="p-4 text-center text-muted-foreground">
                                Start typing to search...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                No results found for "{query}"
                            </div>
                        ) : (
                            <div className="p-2">
                                {searchResults.map((result) => (
                                    <Link
                                        key={result.href}
                                        to={result.href}
                                        onClick={onClose}
                                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                {result.label}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {result.section}
                                            </p>
                                        </div>
                                        <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Tips */}
                    {query.trim() === "" && (
                        <div className="px-4 py-3 border-t border-border bg-muted/50">
                            <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Tip:</span> Search for topics like "billing", "team", or "password"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function SearchBar() {
    const [isOpen, setIsOpen] = useState(false);

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 w-full max-w-sm px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground hover:border-primary/50 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search documentation...
                <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
            </button>

            <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}

function DocsHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="container-xl flex h-16 items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <SiteLogo size="sm" />
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium text-foreground">Docs</span>
                </div>

                <div className="flex-1 max-w-md">
                    <SearchBar />
                </div>
            </div>
        </header>
    );
}

export default function DocsLayout() {
    return (
        <div className="min-h-screen bg-background">
            <DocsHeader />
            <div className="container-xl py-8">
                <div className="flex gap-12">
                    <Sidebar />
                    <main className="flex-1 min-w-0">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
