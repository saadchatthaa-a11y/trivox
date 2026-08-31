import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Called right after supabase.auth.signUp() succeeds on the client.
// Uses the service-role client to create the org + membership + default
// pipeline stages in one place, so a new user can never insert themselves
// into someone else's org (regular RLS policies don't allow org inserts at all).
export async function POST(req: Request) {
  const { userId, fullName, orgName } = await req.json();

  if (!userId || !orgName) {
    return NextResponse.json({ error: "Missing userId or orgName" }, { status: 400 });
  }

  const admin = createAdminClient();

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Math.random().toString(36).slice(2, 7);

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select()
    .single();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  const { error: memberErr } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: userId, full_name: fullName ?? null, role: "admin" });
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  const defaultStages = [
    { name: "New Lead", sort_order: 0, color: "#5B7189" },
    { name: "Contacted", sort_order: 1, color: "#5B8A87" },
    { name: "Qualified", sort_order: 2, color: "#6B9153" },
    { name: "Site Visit", sort_order: 3, color: "#B8974B" },
    { name: "Negotiation", sort_order: 4, color: "#C97E3F" },
    { name: "Booked", sort_order: 5, color: "#4C7A5D", is_won: true },
    { name: "Lost", sort_order: 6, color: "#B45B4C", is_lost: true },
  ];
  const { error: stagesErr } = await admin
    .from("pipeline_stages")
    .insert(defaultStages.map((s) => ({ ...s, org_id: org.id })));
  if (stagesErr) return NextResponse.json({ error: stagesErr.message }, { status: 500 });

  return NextResponse.json({ orgId: org.id, slug: org.slug });
}
