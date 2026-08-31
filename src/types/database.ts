export type Stage = { id: string; name: string; sort_order: number; color: string; is_won?: boolean; is_lost?: boolean };
export type Activity = {
  id: string; activity_type: string; feedback: string | null;
  from_stage_id: string | null; to_stage_id: string | null; created_at: string;
};
export type Lead = {
  id: string; full_name: string | null; phone: string; source: string;
  stage_id: string; budget: string | null; created_at: string; campaign_id: string | null;
  ai_score: number | null; ai_tier: "hot" | "warm" | "cold" | null;
  ai_reason: string | null; ai_next_action: string | null;
};
export type Campaign = { id: string; name: string; description: string | null; enrolled?: number; steps: { day: number; channel: string; subject?: string; message: string }[] };
