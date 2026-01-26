import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchProfile() {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, full_name, avatar_url")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            setProfile(data as Profile);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProfile();
    }, [user?.id]);

    const refreshProfile = async () => {
        await fetchProfile();
    };

    const updateProfile = (updates: Partial<Profile>) => {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
    };

    return (
        <ProfileContext.Provider value={{ profile, loading, refreshProfile, updateProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error("useProfile must be used within a ProfileProvider");
    }
    return context;
}
