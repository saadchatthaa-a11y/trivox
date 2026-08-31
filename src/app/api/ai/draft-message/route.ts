import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { requireAiAccess } from "../_guard";

export async function POST(req: Request) {
  const access = await requireAiAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { orgId, supabase } = access;

  const { leadId, channel } = await req.json();

  const { data: lead } = await supabase.from("leads").select("*, pipeline_stages(name)").eq("id", leadId).eq("org_id", orgId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: lastActivity } = await supabase
    .from("lead_activities").select("feedback").not("feedback", "is", null)
    .eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const prompt = `Write a short, warm, non-pushy ${channel === "email" ? "email" : "WhatsApp message"} from a real estate sales executive to a lead, following up at the "${lead.pipeline_stages?.name}" stage.
Lead name: ${lead.full_name}. Budget: ${lead.budget}. Last note from the team: "${lastActivity?.feedback ?? "no notes yet"}".
${channel === "email" ? 'Include a short subject line on the first line prefixed with "Subject:", then a blank line, then the body.' : "Keep it under 350 characters, conversational, one clear next step, no subject line."}
Use the actual name given, no placeholders. Output only the message text.`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.map((b: any) => b.text || "").join("\n").trim();

  return NextResponse.json({ text });
}
