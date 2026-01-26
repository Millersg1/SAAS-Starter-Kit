import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn(
        "Supabase environment variables not set. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
    );
}

export const supabase = createClient<Database>(
    SUPABASE_URL || "",
    SUPABASE_PUBLISHABLE_KEY || ""
);
