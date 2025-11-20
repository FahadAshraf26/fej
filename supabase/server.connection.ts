import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton instance
let supabaseServerInstance: SupabaseClient | null = null;

// Function that ensures we're on the server
function ensureServerEnvironment() {
  if (typeof window !== "undefined") {
    throw new Error(
      "Supabase server client can only be used on the server side"
    );
  }
}

// Create a function that returns a memoized client
export function getSupabaseServer(): SupabaseClient {
  // Check server environment
  ensureServerEnvironment();

  // Return existing instance if available
  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  // Environment variables check
  const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseURL || !adminKey) {
    throw new Error(
      `Missing Supabase environment variables: ${
        !supabaseURL ? "NEXT_PUBLIC_SUPABASE_URL " : ""
      }${!adminKey ? "SUPABASE_SECRET_KEY" : ""}`.trim()
    );
  }

  // Create and store the instance
  supabaseServerInstance = createClient(supabaseURL, adminKey);
  return supabaseServerInstance;
}

// Create a proxy that uses the memoized client
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    ensureServerEnvironment();

    // Use the memoized client
    if (!supabaseServerInstance) {
      supabaseServerInstance = getSupabaseServer();
    }

    return supabaseServerInstance[prop as keyof SupabaseClient];
  },
});
