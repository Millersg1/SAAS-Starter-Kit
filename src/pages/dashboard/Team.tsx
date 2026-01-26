import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
    Loader2,
    UserPlus,
    Crown,
    Trash2,
    Search,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Member = {
    id: string;
    user_id: string | null;
    role: "admin" | "editor";
    joined_at: string | null;
    invited_email: string | null;
    profile?: {
        email: string;
        full_name: string;
    };
};

type BrandInfo = {
    id: number;
    name: string;
    plan: string;
    memberCount: number;
    memberLimit: number;
};

export default function Team() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [brandInfo, setBrandInfo] = useState<BrandInfo | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<"admin" | "editor" | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
    const [removeLoading, setRemoveLoading] = useState(false);

    useEffect(() => {
        if (user) {
            loadTeamData();
        }
    }, [user?.id]);

    async function loadTeamData() {
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Fetch user's profile to get current_brand_id
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("current_brand_id")
            .eq("id", user.id)
            .single();

        if (!userProfile?.current_brand_id) {
            setIsLoading(false);
            return;
        }

        const brandId = userProfile.current_brand_id;

        // Get brand info
        const { data: brand } = await supabase
            .from("brands")
            .select("id, name")
            .eq("id", brandId)
            .single();

        // Get subscription plan
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan")
            .eq("brand_id", brandId)
            .single();

        const plan = (subscription as { plan?: string })?.plan || "free";

        // Fetch member limit from payment_plans table
        const { data: planData } = await supabase
            .from("payment_plans")
            .select("limit_members")
            .eq("slug", plan)
            .single();

        const memberLimit = (planData as { limit_members?: number })?.limit_members ?? 1;

        // Get members with profiles
        const { data: membersData } = await supabase
            .from("brand_members")
            .select(`
                id,
                user_id,
                role,
                joined_at,
                invited_email,
                profiles:user_id (email, full_name)
            `)
            .eq("brand_id", brandId);

        // Find current user's role
        const currentMember = (membersData as any[] | null)?.find(m => m.user_id === user.id);
        setCurrentUserRole(currentMember?.role as "admin" | "editor" || null);

        // Transform members data
        const transformedMembers: Member[] = ((membersData as any[]) || []).map(m => ({
            id: String(m.id),
            user_id: m.user_id,
            role: m.role as "admin" | "editor",
            joined_at: m.joined_at,
            invited_email: m.invited_email,
            profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles as { email: string; full_name: string } | undefined,
        }));

        setBrandInfo({
            id: brandId,
            name: (brand as { name?: string })?.name || "",
            plan,
            memberCount: transformedMembers.length,
            memberLimit,
        });

        setMembers(transformedMembers);
        setIsLoading(false);
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!brandInfo || !inviteEmail || !user) return;

        setInviteLoading(true);

        if (brandInfo.memberCount >= brandInfo.memberLimit) {
            toast({
                title: "Member Limit Reached",
                description: `Your ${brandInfo.plan} plan allows up to ${brandInfo.memberLimit} members. Please upgrade to invite more.`,
                variant: "destructive",
            });
            setInviteLoading(false);
            return;
        }

        // Check for duplicate email
        const normalizedEmail = inviteEmail.toLowerCase().trim();
        const existingMember = members.find(
            m => m.profile?.email?.toLowerCase() === normalizedEmail ||
                m.invited_email?.toLowerCase() === normalizedEmail
        );

        if (existingMember) {
            toast({
                title: "Already Exists",
                description: "This email is already a member or has a pending invite.",
                variant: "destructive",
            });
            setInviteLoading(false);
            return;
        }

        // Insert pending invite
        const { error: insertError } = await supabase
            .from("brand_members")
            .insert({
                brand_id: brandInfo.id,
                user_id: null,
                role: inviteRole,
                invited_email: inviteEmail,
                invited_at: new Date().toISOString(),
            });

        if (insertError) {
            toast({
                title: "Error",
                description: insertError.message,
                variant: "destructive",
            });
            setInviteLoading(false);
            return;
        }

        // Send invitation email via Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
            try {
                const emailResponse = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        email: inviteEmail,
                        brandId: brandInfo.id,
                        role: inviteRole,
                    }),
                });

                if (!emailResponse.ok) {
                    console.error("Email send failed:", await emailResponse.text());
                }
            } catch (emailErr) {
                console.error("Failed to send invite email:", emailErr);
            }
        }

        toast({
            title: "Invitation Sent",
            description: `An invitation has been sent to ${inviteEmail}`,
        });

        setInviteEmail("");
        setShowInviteModal(false);
        setInviteLoading(false);
        loadTeamData();
    }

    async function handleChangeRole(memberId: string, newRole: "admin" | "editor") {
        const member = members.find(m => m.id === memberId);
        const adminCount = members.filter(m => m.role === "admin" && m.joined_at).length;

        if (member?.role === "admin" && newRole === "editor" && adminCount <= 1) {
            toast({
                title: "Cannot Change Role",
                description: "There must be at least one admin in the team.",
                variant: "destructive",
            });
            return;
        }

        await supabase
            .from("brand_members")
            .update({ role: newRole })
            .eq("id", memberId);

        loadTeamData();
    }

    async function handleRemoveMember() {
        if (!memberToRemove) return;

        setRemoveLoading(true);

        await supabase
            .from("brand_members")
            .delete()
            .eq("id", memberToRemove.id);

        setMemberToRemove(null);
        setRemoveLoading(false);
        loadTeamData();
    }

    const isAdmin = currentUserRole === "admin";
    const canInvite = isAdmin && brandInfo && brandInfo.memberCount < brandInfo.memberLimit;

    const filteredMembers = members.filter((member) => {
        const name = member.profile?.full_name || member.invited_email || "";
        const email = member.profile?.email || member.invited_email || "";
        return name.toLowerCase().includes(search.toLowerCase()) ||
            email.toLowerCase().includes(search.toLowerCase());
    });

    if (isLoading) {
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
                <div>
                    <h1 className="text-2xl font-bold">
                        Team {brandInfo && `(${brandInfo.memberCount}/${brandInfo.memberLimit})`}
                    </h1>
                    <p className="text-muted-foreground">Manage your team members and invitations</p>
                </div>

                {/* Invite Section */}
                {isAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Invite Team Member</CardTitle>
                            <CardDescription>
                                {canInvite
                                    ? "Send an invitation to join your team"
                                    : `Member limit reached (${brandInfo?.memberCount}/${brandInfo?.memberLimit}). Upgrade to add more.`
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => setShowInviteModal(true)} disabled={!canInvite}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Member
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Team Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>Manage your team members and their roles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search members..."
                                className="pl-10"
                            />
                        </div>

                        {/* Members List */}
                        <div className="space-y-3">
                            {filteredMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                            {(member.profile?.full_name || member.invited_email || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {member.profile?.full_name || member.invited_email || "Unknown"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {member.profile?.email || member.invited_email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={member.joined_at ? "default" : "secondary"}>
                                            {member.joined_at ? "Active" : "Pending"}
                                        </Badge>
                                        {isAdmin ? (
                                            <Select
                                                value={member.role}
                                                onValueChange={(value) => handleChangeRole(member.id, value as "admin" | "editor")}
                                            >
                                                <SelectTrigger className="w-24">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="editor">Editor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                {member.role === "admin" && <Crown className="h-3 w-3" />}
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </Badge>
                                        )}
                                        {isAdmin && member.user_id !== user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setMemberToRemove(member)}
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredMembers.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    {search ? `No members found matching "${search}"` : "No team members yet"}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invite Modal */}
            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                            Send an email invitation to join your team.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="colleague@company.com"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "editor")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="editor">Editor - Can edit content, view team</SelectItem>
                                    <SelectItem value="admin">Admin - Full access including billing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={inviteLoading}>
                                {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invite
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Remove Member Modal */}
            <Dialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-500">Remove Member</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{" "}
                            <strong>{memberToRemove?.profile?.full_name || memberToRemove?.invited_email}</strong>{" "}
                            from the team?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMemberToRemove(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleRemoveMember} disabled={removeLoading}>
                            {removeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Remove Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
