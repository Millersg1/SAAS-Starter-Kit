import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Loader2, ArrowLeft, Check, Trash2 } from "lucide-react";

interface Reply {
    id: number;
    message: string;
    is_admin: boolean;
    created_at: string;
    user?: {
        id: string;
        email: string;
        full_name: string | null;
    };
}

interface Ticket {
    id: number;
    public_id: string;
    subject: string;
    message: string;
    status: "open" | "resolved" | "closed";
    created_at: string;
    updated_at: string;
    user_id: string;
}

function TicketDetailSkeleton() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-64 bg-muted rounded"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-full bg-muted rounded"></div>
                            <div className="h-4 w-3/4 bg-muted rounded"></div>
                            <div className="h-4 w-1/2 bg-muted rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

function ReplyBubble({ reply }: { reply: Reply }) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className={`flex ${reply.is_admin ? "justify-start" : "justify-end"}`}>
            <div
                className={`max-w-[75%] rounded-lg p-4 ${reply.is_admin
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted"
                    }`}
            >
                <div className="flex items-center gap-2 mb-2">
                    {reply.is_admin && (
                        <Badge variant="secondary" className="text-xs">
                            Support
                        </Badge>
                    )}
                    <span className="text-sm font-medium">
                        {reply.is_admin ? "Support Team" : (reply.user?.full_name || reply.user?.email || "You")}
                    </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(reply.created_at)}
                </p>
            </div>
        </div>
    );
}

export default function TicketDetail() {
    const { id: publicId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchTicket = async () => {
        if (!publicId || !user) return;

        try {
            // Fetch ticket - only get own tickets
            const { data: ticketData, error: ticketError } = await (supabase as any)
                .from("support_tickets")
                .select("*")
                .eq("public_id", publicId)
                .eq("user_id", user.id)
                .single();

            if (ticketError) throw ticketError;
            if (!ticketData) throw new Error("Ticket not found");

            setTicket(ticketData);

            // Fetch replies
            const { data: repliesData, error: repliesError } = await (supabase as any)
                .from("ticket_replies")
                .select(`
                    *,
                    profiles:user_id (
                        id,
                        email,
                        full_name
                    )
                `)
                .eq("ticket_id", ticketData.id)
                .order("created_at", { ascending: true });

            if (repliesError) throw repliesError;

            setReplies(
                (repliesData || []).map((reply: any) => ({
                    ...reply,
                    user: reply.profiles,
                }))
            );
        } catch (err) {
            console.error("Failed to fetch ticket:", err);
            setError(err instanceof Error ? err.message : "Failed to load ticket");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTicket();
        }
    }, [publicId, user]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !ticket || !user) return;

        setSending(true);
        try {
            const { error: replyError } = await (supabase as any)
                .from("ticket_replies")
                .insert({
                    ticket_id: ticket.id,
                    user_id: user.id,
                    message: replyMessage,
                    is_admin: false,
                });

            if (replyError) throw replyError;

            toast({
                title: "Reply sent",
                description: "Your reply has been added to the ticket.",
            });
            setReplyMessage("");
            fetchTicket();
        } catch (err) {
            console.error("Failed to send reply:", err);
            toast({
                title: "Error",
                description: "Failed to send reply. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!ticket) return;

        setUpdating(true);
        try {
            const { error: updateError } = await (supabase as any)
                .from("support_tickets")
                .update({ status: newStatus })
                .eq("id", ticket.id);

            if (updateError) throw updateError;

            setTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
            toast({
                title: "Status updated",
                description: `Ticket marked as ${newStatus}.`,
            });
        } catch (err) {
            console.error("Failed to update status:", err);
            toast({
                title: "Error",
                description: "Failed to update status.",
                variant: "destructive",
            });
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!ticket) return;

        setDeleting(true);
        try {
            const { error: deleteError } = await (supabase as any)
                .from("support_tickets")
                .delete()
                .eq("id", ticket.id);

            if (deleteError) throw deleteError;

            toast({
                title: "Ticket deleted",
                description: "Your ticket has been deleted.",
            });
            navigate("/dashboard/support");
        } catch (err) {
            console.error("Failed to delete ticket:", err);
            toast({
                title: "Error",
                description: "Failed to delete ticket.",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
        open: "default",
        resolved: "secondary",
        closed: "outline",
    };

    if (loading) return <TicketDetailSkeleton />;

    if (error) {
        return (
            <DashboardLayout>
                <div className="space-y-4">
                    <Link to="/dashboard/support" className="text-primary hover:underline flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Support
                    </Link>
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!ticket) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <Link
                        to="/dashboard/support"
                        className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Support
                    </Link>
                    <div className="flex items-start justify-between gap-4 mt-2">
                        <div>
                            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <Badge variant={statusVariant[ticket.status] || "secondary"}>
                                    {ticket.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Created {formatDate(ticket.created_at)}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {ticket.status === "open" ? (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatusChange("resolved")}
                                    disabled={updating}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Mark Resolved
                                </Button>
                            ) : ticket.status === "resolved" && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatusChange("open")}
                                    disabled={updating}
                                >
                                    Reopen
                                </Button>
                            )}
                            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Original Message */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-medium">You</span>
                            <span className="text-xs text-muted-foreground">
                                (Original message)
                            </span>
                        </div>
                        <p className="whitespace-pre-wrap">{ticket.message}</p>
                    </CardContent>
                </Card>

                {/* Replies */}
                {replies.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="font-semibold">Replies</h2>
                        {replies.map((reply) => (
                            <ReplyBubble key={reply.id} reply={reply} />
                        ))}
                    </div>
                )}

                {/* Reply Form */}
                {ticket.status !== "closed" && (
                    <form onSubmit={handleReply} className="space-y-3">
                        <label className="block text-sm font-medium">Add a Reply</label>
                        <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Write your reply..."
                            rows={3}
                            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={sending || !replyMessage.trim()}>
                                {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {sending ? "Sending..." : "Send Reply"}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur" onClick={() => setShowDeleteModal(false)} />
                        <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                            <h2 className="text-xl font-bold mb-2">Delete Ticket?</h2>
                            <p className="text-muted-foreground mb-4">
                                Are you sure you want to delete this ticket? This action cannot be undone.
                            </p>
                            <p className="text-sm mb-4">
                                <strong>Subject:</strong> {ticket.subject}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Delete Ticket
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
