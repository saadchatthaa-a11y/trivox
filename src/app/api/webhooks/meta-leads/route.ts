import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Verification handshake, same idea as the WhatsApp webhook.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("hub.mode") === "subscribe" && searchParams.get("hub.verify_token") === process.env.META_VERIFY_TOKEN) {
    return new Response(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta sends a `leadgen_id` ping — the actual lead fields must be fetched
// from the Graph API using the page access token you stored for this org
// in `integrations.config`. That fetch is stubbed below: plug in your
// Graph API call (GET /{leadgen_id}?access_token=...) once you have a
// Facebook App + Page reviewed for the leads_retrieval permission.
export async function POST(req: Request) {
  const payload = await req.json();
  const admin = createAdminClient();

  const entry = payload.entry?.[0];
  const leadgenChange = entry?.changes?.find((c: any) => c.field === "leadgen");
  const pageId = entry?.id;
  const leadgenId = leadgenChange?.value?.leadgen_id;
  const source = leadgenChange?.value?.page_id ? "facebook" : "facebook"; // Instagram lead ads use the same field shape

  if (!pageId || !leadgenId) return NextResponse.json({ ok: true });

  const { data: integration } = await admin
    .from("integrations").select("org_id, config").eq("type", "meta_leads").eq("external_id", pageId).single();
  if (!integration) return NextResponse.json({ ok: true });

  // TODO: replace with a real Graph API fetch using integration.config.page_access_token
  // const graphRes = await fetch(`https://graph.facebook.com/v20.0/${leadgenId}?access_token=${integration.config.page_access_token}`);
  // const fullLead = await graphRes.json();
  const fullLead = { field_data: [{ name: "full_name", values: ["New Lead"] }, { name: "phone_number", values: ["unknown"] }] };

  const getField = (name: string) => fullLead.field_data.find((f: any) => f.name === name)?.values?.[0];

  const { data: firstStage } = await admin
    .from("pipeline_stages").select("id").eq("org_id", integration.org_id).order("sort_order").limit(1).single();

  const { data: newLead } = await admin
    .from("leads").insert({
      org_id: integration.org_id,
      full_name: getField("full_name") ?? "New Lead",
      phone: getField("phone_number") ?? "unknown",
      email: getField("email"),
      source,
      stage_id: firstStage?.id,
      raw_payload: fullLead,
    }).select().single();

  await admin.from("lead_activities").insert({
    org_id: integration.org_id, lead_id: newLead?.id, activity_type: "created",
    feedback: `Lead captured via ${source === "facebook" ? "Facebook/Instagram" : source} Lead Ad`,
  });

  return NextResponse.json({ ok: true });
}
