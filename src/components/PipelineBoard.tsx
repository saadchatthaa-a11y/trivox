"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Stage, Lead, Activity } from "@/types/database";

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram", referral: "Referral", manual: "Manual",
};
const AI_TIER_CLASS: Record<string, string> = {
  hot: "bg-rust/15 text-rust", warm: "bg-brass/20 text-brassdark", cold: "bg-ink/10 text-ink/60",
};

export default function PipelineBoard() {
  const supabase = createClient();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const { data: stageRows } = await supabase.from("pipeline_stages").select("*").order("sort_order");
    const { data: leadRows } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setStages(stageRows ?? []);
    setLeads(leadRows ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  async function openLead(lead: Lead) {
    setActiveLead(lead);
    const { data } = await supabase.from("lead_activities").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setActivities(data ?? []);
  }

  async function addManualLead(form: { name: string; phone: string; source: string; budget: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = await supabase.from("org_members").select("org_id, id").eq("user_id", user!.id).single();
    const firstStage = stages[0];
    const { data: lead } = await supabase.from("leads").insert({
      org_id: membership!.org_id, full_name: form.name, phone: form.phone,
      source: form.source, budget: form.budget, stage_id: firstStage.id, assigned_to: membership!.id,
    }).select().single();
    if (lead) {
      await supabase.from("lead_activities").insert({
        org_id: membership!.org_id, lead_id: lead.id, activity_type: "created", feedback: "Added manually",
      });
      loadAll();
    }
  }

  async function updateStage(leadId: string, newStageId: string, note: string) {
    const lead = leads.find((l) => l.id === leadId)!;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = await supabase.from("org_members").select("org_id, id").eq("user_id", user!.id).single();

    if (newStageId !== lead.stage_id) {
      await supabase.from("lead_activities").insert({
        org_id: membership!.org_id, lead_id: leadId, activity_type: "stage_change",
        from_stage_id: lead.stage_id, to_stage_id: newStageId, feedback: note || null, performed_by: membership!.id,
      });
      await supabase.from("leads").update({ stage_id: newStageId, updated_at: new Date().toISOString() }).eq("id", leadId);
    } else if (note) {
      await supabase.from("lead_activities").insert({
        org_id: membership!.org_id, lead_id: leadId, activity_type: "note", feedback: note, performed_by: membership!.id,
      });
    }
    setActiveLead(null);
    loadAll();
  }

  if (loading) return <div className="text-sm text-ink/50">Loading pipeline…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Lead Pipeline</h1>
        <AddLeadButton onAdd={addManualLead} />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = leads.filter((l) => l.stage_id === stage.id);
          return (
            <div key={stage.id} className="min-w-[260px] max-w-[260px] bg-white border border-line rounded-lg flex flex-col max-h-[75vh]">
              <div className="p-3 border-b border-line">
                <div className="h-1 rounded mb-2" style={{ background: stage.color }} />
                <div className="flex justify-between text-sm font-bold">
                  <span>{stage.name}</span>
                  <span className="text-ink/40 bg-paper rounded-full px-2 text-xs">{items.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto">
                {items.map((lead) => (
                  <button key={lead.id} onClick={() => openLead(lead)}
                    className="w-full text-left bg-white border border-line rounded-md p-2.5 hover:shadow-sm">
                    <div className="text-sm font-bold">{lead.full_name || lead.phone}</div>
                    <div className="text-xs text-ink/50 mb-1.5">{lead.phone} · {lead.budget}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold bg-ink/5 rounded-full px-2 py-0.5">{SOURCE_LABEL[lead.source]}</span>
                      {lead.ai_tier && (
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${AI_TIER_CLASS[lead.ai_tier]}`}>
                          {lead.ai_tier.toUpperCase()} {lead.ai_score}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {items.length === 0 && <div className="text-xs text-ink/40 text-center border border-dashed border-line rounded-md p-4">No leads</div>}
              </div>
            </div>
          );
        })}
      </div>

      {activeLead && (
        <LeadModal lead={activeLead} stages={stages} activities={activities}
          onClose={() => setActiveLead(null)} onSave={updateStage} />
      )}
    </div>
  );
}

function AddLeadButton({ onAdd }: { onAdd: (f: { name: string; phone: string; source: string; budget: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [source, setSource] = useState("manual"); const [budget, setBudget] = useState("40-60L");
  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-brass hover:bg-brassdark text-white text-sm font-semibold rounded-md px-4 py-2">+ Add lead</button>
      {open && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-5" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Add lead</h3>
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-3 text-sm" />
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-3 text-sm" />
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-3 text-sm">
              <option value="manual">Manual</option><option value="referral">Referral</option>
              <option value="whatsapp">WhatsApp</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option>
            </select>
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-4 text-sm">
              <option>40-60L</option><option>60-90L</option><option>90L-1.2Cr</option><option>1.2-1.8Cr</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-2">Cancel</button>
              <button onClick={() => { onAdd({ name, phone, source, budget }); setOpen(false); setName(""); setPhone(""); }}
                className="bg-brass text-white text-sm font-semibold rounded-md px-4 py-2">Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LeadModal({ lead, stages, activities, onClose, onSave }:
  { lead: Lead; stages: Stage[]; activities: Activity[]; onClose: () => void; onSave: (id: string, stageId: string, note: string) => void }) {
  const [stageId, setStageId] = useState(lead.stage_id);
  const [note, setNote] = useState("");
  const [scoring, setScoring] = useState(false);
  const [aiResult, setAiResult] = useState<{ score: number; tier: string; reason: string; next_action: string } | null>(
    lead.ai_tier ? { score: lead.ai_score!, tier: lead.ai_tier, reason: lead.ai_reason!, next_action: lead.ai_next_action! } : null
  );
  const [channel, setChannel] = useState("whatsapp");
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState("");

  async function scoreLead() {
    setScoring(true);
    const res = await fetch("/api/ai/score-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    const body = await res.json();
    if (res.ok) setAiResult(body); else alert(body.error);
    setScoring(false);
  }
  async function draftMessage() {
    setDrafting(true);
    const res = await fetch("/api/ai/draft-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, channel }) });
    const body = await res.json();
    if (res.ok) setDraft(body.text); else alert(body.error);
    setDrafting(false);
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl p-6 w-full max-w-xl max-h-[88vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-serif text-xl font-semibold">{lead.full_name || lead.phone}</h2>
          <button onClick={onClose} className="text-ink/40">✕</button>
        </div>

        <label className="text-xs font-bold uppercase text-ink/50">Stage</label>
        <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-3 text-sm">
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="text-xs font-bold uppercase text-ink/50">Add feedback / call note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-line rounded-md px-3 py-2 mb-3 text-sm min-h-[60px]" />
        <div className="flex justify-end mb-5">
          <button onClick={() => onSave(lead.id, stageId, note)} className="bg-brass text-white text-sm font-semibold rounded-md px-4 py-2">Save update</button>
        </div>

        <div className="bg-paper border border-line rounded-lg p-3 mb-3">
          {aiResult ? (
            <>
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${AI_TIER_CLASS[aiResult.tier]}`}>{aiResult.tier.toUpperCase()} · {aiResult.score}/100</span>
                <button onClick={scoreLead} className="text-xs text-brassdark font-semibold">{scoring ? "Scoring…" : "Re-score"}</button>
              </div>
              <p className="text-xs"><b>Why:</b> {aiResult.reason}</p>
              <p className="text-xs"><b>Next:</b> {aiResult.next_action}</p>
            </>
          ) : (
            <button onClick={scoreLead} disabled={scoring} className="bg-white border border-line text-sm font-semibold rounded-md px-3 py-1.5">
              {scoring ? "Scoring…" : "Score this lead with AI"}
            </button>
          )}
        </div>

        <div className="bg-paper border border-line rounded-lg p-3 mb-5">
          <div className="flex gap-2 mb-2">
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="border border-line rounded-md px-2 py-1.5 text-xs">
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
            </select>
            <button onClick={draftMessage} disabled={drafting} className="bg-white border border-line text-xs font-semibold rounded-md px-3 py-1.5">
              {drafting ? "Drafting…" : "Draft follow-up with AI"}
            </button>
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="AI draft appears here — edit before sending"
            className="w-full border border-line rounded-md px-3 py-2 text-sm min-h-[70px]" />
        </div>

        <div className="text-xs font-bold uppercase text-ink/50 mb-2">Activity timeline</div>
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="border-l-2 border-line pl-3">
              <div className="text-xs font-bold text-ink2">{a.activity_type.replace("_", " ")}</div>
              {a.feedback && <div className="text-xs">{a.feedback}</div>}
              <div className="text-[10px] text-ink/40">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
