"use client";

import { useState } from "react";
import { PLANS, type PlanKey } from "@/lib/plans";

export default function PricingTable() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  async function subscribe(plan: PlanKey) {
    setLoadingPlan(plan);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();
    if (body.url) {
      window.location.href = body.url;
    } else {
      alert(body.error ?? "Could not start checkout. Are you logged in?");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {(Object.keys(PLANS) as PlanKey[]).map((key) => {
        const plan = PLANS[key];
        const featured = key === "pro";
        return (
          <div key={key}
            className={`rounded-xl border p-6 flex flex-col ${featured ? "border-brass shadow-lg scale-[1.03]" : "border-line"} bg-white`}>
            {featured && <span className="text-xs font-bold text-brassdark mb-2">MOST POPULAR</span>}
            <h3 className="font-serif text-xl font-semibold mb-1">{plan.name}</h3>
            <div className="text-3xl font-bold mb-1">${plan.priceMonthly}<span className="text-sm font-normal text-ink/50">/mo</span></div>
            <ul className="text-sm text-ink/70 space-y-2 my-5 flex-1">
              <li>Up to {plan.seats} team seats</li>
              <li>{plan.leadsPerMonth ? `${plan.leadsPerMonth} leads/month` : "Unlimited leads"}</li>
              <li>WhatsApp + Facebook/Instagram intake</li>
              <li>{plan.aiFeatures ? "AI scoring, drafting & campaigns" : "Core pipeline (no AI features)"}</li>
            </ul>
            <button onClick={() => subscribe(key)} disabled={loadingPlan === key}
              className={`w-full rounded-md py-2.5 text-sm font-semibold ${featured ? "bg-brass hover:bg-brassdark text-white" : "border border-line hover:bg-paper"}`}>
              {loadingPlan === key ? "Redirecting…" : "Choose " + plan.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
