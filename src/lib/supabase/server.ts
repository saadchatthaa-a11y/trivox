import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler Supabase client — reads the user's
// session from cookies, still subject to RLS.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // called from a Server Component with no writable cookies — safe to ignore,
            // middleware.ts handles session refresh instead.
          }
        },
      },
    }
  );
}

// Service-role client — bypasses RLS entirely. Only use for:
//  - creating a new org + membership at signup
//  - webhooks (WhatsApp / Meta / Stripe) that have no user session
// Never import this into client components.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}