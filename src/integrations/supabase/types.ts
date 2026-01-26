export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            teams: {
                Row: {
                    id: string;
                    name: string;
                    owner_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    owner_id: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    owner_id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            team_members: {
                Row: {
                    id: string;
                    team_id: string;
                    user_id: string;
                    role: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    team_id: string;
                    user_id: string;
                    role?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    team_id?: string;
                    user_id?: string;
                    role?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            subscriptions: {
                Row: {
                    id: string;
                    user_id: string;
                    stripe_customer_id: string | null;
                    stripe_subscription_id: string | null;
                    plan_id: string | null;
                    status: string;
                    current_period_start: string | null;
                    current_period_end: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    stripe_customer_id?: string | null;
                    stripe_subscription_id?: string | null;
                    plan_id?: string | null;
                    status?: string;
                    current_period_start?: string | null;
                    current_period_end?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    stripe_customer_id?: string | null;
                    stripe_subscription_id?: string | null;
                    plan_id?: string | null;
                    status?: string;
                    current_period_start?: string | null;
                    current_period_end?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            support_tickets: {
                Row: {
                    id: string;
                    user_id: string;
                    subject: string;
                    message: string;
                    status: string;
                    priority: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    subject: string;
                    message: string;
                    status?: string;
                    priority?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    subject?: string;
                    message?: string;
                    status?: string;
                    priority?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
