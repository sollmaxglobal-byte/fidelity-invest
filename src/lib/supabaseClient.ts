import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anon) {
  throw new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Vercel project environment.",
  );
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    // Supabase's browser storage persists the session across Vercel refreshes.
    persistSession: true,
    autoRefreshToken: true,
  },
});
