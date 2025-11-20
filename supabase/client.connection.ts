import { createClient } from "@supabase/supabase-js";

const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== 'undefined') {
  console.warn(
    "⚠️  Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables in Replit Secrets."
  );
}

export const supabase = createClient(supabaseURL, supabaseKey);
