import { NextResponse } from "next/server";
import { anthropic, stripJsonFences } from "@/lib/anthropic";
import { requireAiAccess } from "../_guard";

export async function POST(req: Request) {
  const access = await requireAiAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { orgId, supabase } = access;

  const { leadId } = await req.json();

  const { data: lead } = await supabase.from("leads").select("*, pipeline_stages(name)").eq("id", leadId).eq("org_id", orgId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: activities } = await supabase
    .from("lead_activities").select("feedback, activity_type, created_at")
    .eq("lead_id", leadId).order("created_at", { ascending: false }).limit(4);

  const daysOld = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);
  const notes = (activities ?? []).map((a) => a.feedback || a.activity_type).join(" | ") || "none yet";

  const prompt = `You are a real estate sales-ops assistant. Score this lead's likelihood to convert to a booking in the next 30 days, 0-100.
Respond with ONLY raw JSON, no markdown fences: {"score": number, "tier": "hot" or "warm" or "cold", "reason": "one short sentence", "next_action": "one short concrete next step"}.
Lead — source: ${lead.source}, budget: ${lead.budget}, stage: ${lead.pipeline_stages?.name}, days since created: ${daysOld}.
Recent activity: ${notes}.`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.map((b: any) => b.text || "").join("\n");
  const parsed = JSON.parse(stripJsonFences(text));

  await supabase.from("leads").update({
    ai_score: Math.round(parsed.score),
    ai_tier: parsed.tier,
    ai_reason: parsed.reason,
    ai_next_action: parsed.next_action,
    ai_scored_at: new Date().toISOString(),
  }).eq("id", leadId);

  return NextResponse.json(parsed);
}
