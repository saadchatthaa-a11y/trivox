import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { planFromPriceId } from "@/lib/plans";
import Stripe from "stripe";

// Stripe calls this on every billing event. Configure the endpoint URL
// (https://yourapp.com/api/webhooks/stripe) in the Stripe Dashboard and
// put its signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      if (orgId) {
        await admin.from("organizations").update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
          plan: session.metadata?.plan ?? "starter",
        }).eq("id", orgId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.org_id;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planFromPriceId(priceId) : null;
      if (orgId) {
        await admin.from("organizations").update({
          subscription_status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
          ...(plan ? { plan } : {}),
        }).eq("id", orgId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.org_id;
      if (orgId) {
        await admin.from("organizations").update({ subscription_status: "canceled" }).eq("id", orgId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
