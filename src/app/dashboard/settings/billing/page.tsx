"use client";

import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const body = await res.json();
    if (body.url) window.location.href = body.url;
    else { alert(body.error); setLoading(false); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl font-semibold mb-2">Billing</h1>
      <p className="text-sm text-ink/60 mb-6">Manage your plan, payment method, and invoices via Stripe's secure billing portal.</p>
      <button onClick={openPortal} disabled={loading}
        className="bg-brass hover:bg-brassdark text-white font-semibold rounded-md px-5 py-2.5 text-sm">
        {loading ? "Opening…" : "Manage subscription"}
      </button>
    </div>
  );
}
