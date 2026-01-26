import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Loader2, Upload, X } from "lucide-react";

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

export default function SettingsPage() {
    const { user, updatePassword } = useAuth();
    const { toast } = useToast();
    const { refreshProfile } = useProfile();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [fullName, setFullName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    async function fetchProfile() {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, full_name, avatar_url")
                .eq("id", user.id)
                .single();

            if (error) throw error;

            setProfile(data as Profile);
            setFullName(data?.full_name || "");
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            toast({
                title: "Error",
                description: "Failed to load profile",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName, updated_at: new Date().toISOString() })
                .eq("id", user.id);

            if (error) throw error;

            setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
            refreshProfile(); // Update navbar
            toast({
                title: "Success",
                description: "Profile updated successfully!",
            });
        } catch (error) {
            console.error("Failed to save profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingAvatar(true);

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split(".").pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL with cache-busting timestamp
            const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            // Add cache-busting parameter to force browser to fetch new image
            const avatarUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

            // Update profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: avatarUrlWithCacheBust, updated_at: new Date().toISOString() })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setProfile(prev => prev ? { ...prev, avatar_url: avatarUrlWithCacheBust } : null);
            refreshProfile(); // Update navbar
            toast({
                title: "Success",
                description: "Avatar uploaded successfully!",
            });
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            toast({
                title: "Error",
                description: "Failed to upload avatar",
                variant: "destructive",
            });
        } finally {
            setIsUploadingAvatar(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    }

    async function handleRemoveAvatar() {
        if (!user) return;

        setIsUploadingAvatar(true);

        try {
            // Update profile to remove avatar URL
            const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: null, updated_at: new Date().toISOString() })
                .eq("id", user.id);

            if (error) throw error;

            setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
            refreshProfile(); // Update navbar
            toast({
                title: "Success",
                description: "Avatar removed",
            });
        } catch (error) {
            console.error("Failed to remove avatar:", error);
            toast({
                title: "Error",
                description: "Failed to remove avatar",
                variant: "destructive",
            });
        } finally {
            setIsUploadingAvatar(false);
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 8) {
            toast({
                title: "Error",
                description: "Password must be at least 8 characters",
                variant: "destructive",
            });
            return;
        }

        setIsChangingPassword(true);
        const { error } = await updatePassword(newPassword);

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success",
                description: "Password updated successfully",
            });
            setNewPassword("");
            setConfirmPassword("");
        }

        setIsChangingPassword(false);
    }

    const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";
    const initials = displayName.charAt(0).toUpperCase();

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
            <div className="space-y-6 max-w-2xl">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold">Edit Profile</h1>
                    <p className="text-muted-foreground">Update your account details and preferences</p>
                </div>

                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your account details and profile picture</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Avatar */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative">
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={displayName}
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-medium">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                                </Button>
                                {profile?.avatar_url && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={handleRemoveAvatar}
                                        disabled={isUploadingAvatar}
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile?.email || user?.email || ""}
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password to keep your account secure</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    minLength={8}
                                />
                                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    minLength={8}
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={isChangingPassword}>
                                    {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
