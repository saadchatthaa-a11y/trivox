import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// 1) Meta calls GET once to verify the webhook URL.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// 2) Meta POSTs every inbound WhatsApp message here.
// Multi-tenant routing: each org registers their WhatsApp phone_number_id
// in the `integrations` table (type='whatsapp'), so we know which org a
// message belongs to.
export async function POST(req: Request) {
  const payload = await req.json();
  const admin = createAdminClient();

  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const phoneNumberId = change?.metadata?.phone_number_id;
  const message = change?.messages?.[0];
  if (!phoneNumberId || !message) return NextResponse.json({ ok: true }); // status callback, not a message

  const { data: integration } = await admin
    .from("integrations").select("org_id").eq("type", "whatsapp").eq("external_id", phoneNumberId).single();
  if (!integration) return NextResponse.json({ ok: true }); // unknown number, ignore

  const fromPhone = message.from;
  const text = message.text?.body ?? "[non-text message]";

  const { data: existingLead } = await admin
    .from("leads").select("id").eq("org_id", integration.org_id).eq("phone", fromPhone).maybeSingle();

  let leadId = existingLead?.id;

  if (!leadId) {
    const { data: firstStage } = await admin
      .from("pipeline_stages").select("id").eq("org_id", integration.org_id).order("sort_order").limit(1).single();

    const { data: newLead } = await admin
      .from("leads").insert({
        org_id: integration.org_id, phone: fromPhone, full_name: fromPhone,
        source: "whatsapp", stage_id: firstStage?.id, raw_payload: message,
      }).select().single();
    leadId = newLead?.id;

    await admin.from("lead_activities").insert({
      org_id: integration.org_id, lead_id: leadId, activity_type: "created", feedback: "Lead captured via WhatsApp",
    });
  }

  await admin.from("lead_activities").insert({
    org_id: integration.org_id, lead_id: leadId, activity_type: "whatsapp_msg", feedback: text,
  });

  return NextResponse.json({ ok: true });
}
