import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

// Shared check for every AI route: must be logged in, must belong to an org,
// and that org's plan must include AI features.
export async function requireAiAccess() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Log in first", status: 401 } as const;

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(plan, subscription_status)")
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "No organization found", status: 400 } as const;

  const org = (membership as any).organizations;
  if (!PLANS[org.plan as keyof typeof PLANS]?.aiFeatures) {
    return { error: "AI features require the Pro or Agency plan", status: 402 } as const;
  }
  if (org.subscription_status === "canceled") {
    return { error: "Subscription inactive — please update billing", status: 402 } as const;
  }

  return { orgId: membership.org_id, supabase } as const;
}
