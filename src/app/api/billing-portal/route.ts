import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Sends the org's admin to Stripe's hosted billing portal
// (update card, change plan, view invoices, cancel).
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("organizations(stripe_customer_id)")
    .eq("user_id", user.id)
    .single();
  const customerId = (membership as any)?.organizations?.stripe_customer_id;
  if (!customerId) return NextResponse.json({ error: "No billing account yet — subscribe to a plan first" }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
