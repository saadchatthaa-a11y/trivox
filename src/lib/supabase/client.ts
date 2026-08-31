"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. RLS policies (see supabase/schema.sql)
// make sure every query only ever returns rows for the signed-in user's org.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
