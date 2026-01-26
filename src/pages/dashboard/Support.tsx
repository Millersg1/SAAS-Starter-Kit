import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Loader2, Plus, Search, BookOpen, Eye, Trash2 } from "lucide-react";

interface Ticket {
    id: string;
    public_id: string;
    subject: string;
    message: string;
    status: "open" | "resolved" | "closed";
    created_at: string;
    updated_at: string;
    reply_count?: number;
    has_new_reply?: boolean;
}

function CreateTicketModal({ isOpen, onClose, onCreated }: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // First, get the user's brand_id from brand_members
            const { data: memberData, error: memberError } = await (supabase as any)
                .from("brand_members")
                .select("brand_id")
                .eq("user_id", user.id)
                .single();

            if (memberError || !memberData?.brand_id) {
                throw new Error("Could not find your brand membership. Please contact support.");
            }

            const { error: insertError } = await (supabase as any)
                .from("support_tickets")
                .insert({
                    subject,
                    message,
                    status: "open",
                    user_id: user.id,
                    brand_id: memberData.brand_id,
                });

            if (insertError) throw insertError;

            toast({
                title: "Ticket created",
                description: "We'll get back to you soon!",
            });
            setSubject("");
            setMessage("");
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
                <h2 className="text-xl font-bold mb-4">Create Support Ticket</h2>

                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief description of your issue"
                            required
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe your issue in detail..."
                            required
                            rows={5}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Ticket
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function SupportPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchTickets = async () => {
        if (!user) return;

        try {
            const { data, error: fetchError } = await (supabase as any)
                .from("support_tickets")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (fetchError) throw fetchError;
            setTickets(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTickets();
        }
    }, [user]);

    const filteredTickets = tickets.filter((ticket) =>
        ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.message.toLowerCase().includes(search.toLowerCase())
    );

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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Help & Support</h1>
                    <div className="flex gap-3">
                        <Link to="/docs">
                            <Button variant="outline">
                                <BookOpen className="w-4 h-4 mr-2" />
                                View Docs
                            </Button>
                        </Link>
                        <Button onClick={() => setShowModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Ticket
                        </Button>
                    </div>
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
                                placeholder="Search tickets..."
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
                                        Subject
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
                                        className={`hover:bg-muted/30 transition-colors ${ticket.has_new_reply ? "bg-primary/5" : ""}`}
                                    >
                                        <td className="px-4 py-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {ticket.subject}
                                                    </span>
                                                    {ticket.has_new_reply && (
                                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="New reply" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-muted-foreground line-clamp-1">
                                                    {ticket.message}
                                                </span>
                                            </div>
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
                                                    to={`/dashboard/support/${ticket.public_id}`}
                                                    className="p-2 rounded-lg hover:bg-primary/10 transition-colors inline-flex"
                                                    title="View ticket"
                                                >
                                                    <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                                </Link>
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
                            ) : (
                                <div>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                        <Search className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <p className="mb-4">No support tickets yet</p>
                                    <Button onClick={() => setShowModal(true)}>
                                        Create Your First Ticket
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    {filteredTickets.length > 0 && (
                        <div className="px-4 py-3 border-t border-border">
                            <span className="text-sm text-muted-foreground">
                                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    )}
                </div>

                {/* Create Ticket Modal */}
                <CreateTicketModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onCreated={fetchTickets}
                />

                {/* Delete Confirmation Modal */}
                {ticketToDelete && (
                    <>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur z-40" onClick={() => setTicketToDelete(null)} />
                        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                            <div className="bg-card rounded-xl border border-border shadow-lg max-w-md w-full p-6">
                                <h3 className="text-lg font-semibold mb-4 text-destructive">Delete Ticket</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Are you sure you want to delete "{ticketToDelete.subject}"? This action cannot be undone.
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
            </div>
        </DashboardLayout>
    );
}
