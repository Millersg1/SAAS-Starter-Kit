import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Eye, Check, Trash2, HelpCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
    id: string;
    public_id: string;
    subject: string;
    message: string;
    status: "open" | "resolved" | "closed";
    created_at: string;
    updated_at: string;
    user_id: string;
    user?: {
        email: string;
        full_name: string | null;
    };
}

type StatusFilter = "all" | "open" | "resolved" | "closed";

export default function AdminSupportPage() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showUpsellModal, setShowUpsellModal] = useState(false);

    const fetchTickets = async () => {
        try {
            // Fetch tickets with user profile info
            const { data, error: fetchError } = await (supabase as any)
                .from("support_tickets")
                .select(`
                    *,
                    profiles:user_id (
                        email,
                        full_name
                    )
                `)
                .order("created_at", { ascending: false });

            if (fetchError) throw fetchError;

            // Transform the data to match our interface
            const transformedTickets = (data || []).map((ticket: any) => ({
                ...ticket,
                user: ticket.profiles,
            }));

            setTickets(transformedTickets);
        } catch (err) {
            console.error("Failed to fetch tickets:", err);
            setError(err instanceof Error ? err.message : "Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch =
            ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
            ticket.message.toLowerCase().includes(search.toLowerCase()) ||
            ticket.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
            ticket.user?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const counts = {
        all: tickets.length,
        open: tickets.filter(t => t.status === "open").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
        closed: tickets.filter(t => t.status === "closed").length,
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        open: "default",
        resolved: "secondary",
        closed: "outline",
    };

    const handleDelete = async () => {
        if (!ticketToDelete) return;
        setDeleting(true);
        try {
            const { error: deleteError } = await (supabase as any)
                .from("support_tickets")
                .delete()
                .eq("id", ticketToDelete.id);

            if (deleteError) throw deleteError;

            toast({
                title: "Ticket deleted",
                description: "The ticket has been removed.",
            });
            fetchTickets();
            setTicketToDelete(null);
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to delete ticket",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleStatusToggle = async (ticket: Ticket) => {
        const newStatus = ticket.status === "open" ? "resolved" : "open";
        try {
            const { error: updateError } = await (supabase as any)
                .from("support_tickets")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", ticket.id);

            if (updateError) throw updateError;

            toast({
                title: "Status updated",
                description: `Ticket marked as ${newStatus}`,
            });
            fetchTickets();
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Support Tickets ({tickets.length})</h1>
                <Button onClick={() => setShowUpsellModal(true)}>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Can't fix it?
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["all", "open", "resolved", "closed"] as StatusFilter[]).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={cn(
                            "p-4 rounded-lg border text-left transition-colors",
                            statusFilter === status
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                        )}
                    >
                        <p className="text-2xl font-bold">{counts[status]}</p>
                        <p className="text-sm text-muted-foreground capitalize">{status}</p>
                    </button>
                ))}
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
            )}

            {/* Table Card */}
            <div className="bg-card rounded-xl border border-border">
                {/* Search Bar */}
                <div className="p-4 border-b border-border">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tickets or users..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Ticket
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTickets.map((ticket) => (
                                <tr
                                    key={ticket.id}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-4">
                                        <div>
                                            <span className="font-medium text-foreground">
                                                {ticket.subject}
                                            </span>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {ticket.message}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-foreground">
                                            {ticket.user?.full_name || ticket.user?.email || "Unknown"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={statusVariant[ticket.status] || "secondary"}>
                                            {ticket.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-muted-foreground">
                                            {formatDate(ticket.created_at)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link
                                                to={`/admin/support/${ticket.public_id}`}
                                                className="p-2 rounded-lg hover:bg-primary/10 transition-colors inline-flex"
                                                title="View ticket"
                                            >
                                                <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                            </Link>
                                            <button
                                                onClick={() => handleStatusToggle(ticket)}
                                                className="p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                                                title={ticket.status === "open" ? "Resolve" : "Reopen"}
                                            >
                                                <Check className="w-4 h-4 text-muted-foreground hover:text-green-500" />
                                            </button>
                                            <button
                                                onClick={() => setTicketToDelete(ticket)}
                                                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                                                title="Delete ticket"
                                            >
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredTickets.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {search ? (
                            <p>No tickets found matching "{search}"</p>
                        ) : statusFilter !== "all" ? (
                            <p>No {statusFilter} tickets</p>
                        ) : (
                            <p>No support tickets yet</p>
                        )}
                    </div>
                )}

                {/* Footer */}
                {filteredTickets.length > 0 && (
                    <div className="px-4 py-3 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                            Showing {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {ticketToDelete && (
                <>
                    <div className="fixed inset-0 min-h-screen bg-black/40 backdrop-blur z-40" onClick={() => setTicketToDelete(null)} />
                    <div className="fixed inset-0 min-h-screen flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl border border-border shadow-lg max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold mb-4 text-destructive">Delete Ticket</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                Are you sure you want to delete this ticket?
                            </p>
                            <p className="text-sm font-medium mb-4">"{ticketToDelete.subject}"</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                From: {ticketToDelete.user?.full_name || ticketToDelete.user?.email || "Unknown"}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setTicketToDelete(null)}>
                                    Cancel
                                </Button>
                                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Delete Ticket
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Upsell Modal - Can't fix it? */}
            {showUpsellModal && (
                <>
                    <div className="fixed inset-0 min-h-screen bg-black/40 backdrop-blur z-40" onClick={() => setShowUpsellModal(false)} />
                    <div className="fixed inset-0 min-h-screen flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl border border-zinc-700 shadow-2xl max-w-md w-full p-8 text-center relative">
                            {/* Close button */}
                            <button
                                onClick={() => setShowUpsellModal(false)}
                                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Shield icon */}
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-blue-500/20 rounded-full">
                                    <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3">
                                Need Help Fixing Issues?
                            </h3>
                            <p className="text-zinc-400 mb-6">
                                Security experts at TheFinal20 can help you resolve these issues quickly and ship with confidence.
                            </p>

                            {/* Coupon Badge */}
                            <div className="mb-6">
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-semibold">
                                    🎁 Use code <span className="font-mono bg-amber-500/30 px-2 py-0.5 rounded">SSK30</span> for 30% off
                                </span>
                            </div>

                            {/* CTA Button */}
                            <a
                                href="https://thefinal20.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Get Expert Help
                                <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                                onClick={() => setShowUpsellModal(false)}
                                className="mt-4 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                            >
                                No thanks, I'll figure it out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
