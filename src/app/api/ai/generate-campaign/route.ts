import { NextResponse } from "next/server";
import { anthropic, stripJsonFences } from "@/lib/anthropic";
import { requireAiAccess } from "../_guard";

export async function POST(req: Request) {
  const access = await requireAiAccess();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { goal } = await req.json();
  if (!goal) return NextResponse.json({ error: "Describe the campaign goal" }, { status: 400 });

  const prompt = `You are a real estate CRM assistant. Create a short multi-touch follow-up campaign (3-5 steps) for this goal: "${goal}".
Respond with ONLY raw JSON, no markdown fences: {"name": "short campaign name (max 6 words)", "steps": [{"day": number, "channel": "whatsapp" or "email", "subject": "only if email else empty string", "message": "concrete short message text"}]}`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.map((b: any) => b.text || "").join("\n");
  const parsed = JSON.parse(stripJsonFences(text));

  return NextResponse.json(parsed);
}
