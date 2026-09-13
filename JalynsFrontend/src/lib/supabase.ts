import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-anon"),
);

if (!isSupabaseConfigured) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase anon key.",
  );
}

/**
 * Browser client for Jalyn's Resort Supabase (anon/publishable key).
 * Uses a safe placeholder when env is missing so the marketing site still renders.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl! : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey! : "public-anon-key-placeholder",
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  },
);
