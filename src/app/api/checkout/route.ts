import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { priceIdFor, type PlanKey } from "@/lib/plans";

// Creates a Stripe Checkout session for the caller's org to subscribe to a plan.
export async function POST(req: Request) {
  const { plan } = (await req.json()) as { plan: PlanKey };
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(id, name, stripe_customer_id)")
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "No organization found for this account" }, { status: 400 });

  const org = (membership as any).organizations;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: org.stripe_customer_id ?? undefined,
    customer_email: org.stripe_customer_id ? undefined : user.email!,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#pricing`,
    metadata: { org_id: org.id, plan },
    subscription_data: { metadata: { org_id: org.id, plan } },
  });

  return NextResponse.json({ url: session.url });
}
