"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create account");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, fullName, orgName }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not set up your organization");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-1">Create your agency account</h1>
        <p className="text-sm text-ink/60 mb-6">Get started with SAC CRM today.</p>

        {error && <div className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-md p-3 mb-4">{error}</div>}

        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Agency / company name</label>
        <input required value={orgName} onChange={(e) => setOrgName(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-4 text-sm" placeholder="Skyline Realty" />

        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Your name</label>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-4 text-sm" placeholder="Jane Doe" />

        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Work email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-4 text-sm" placeholder="jane@skylinerealty.com" />

        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Password</label>
        <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-6 text-sm" placeholder="At least 8 characters" />

        <button disabled={loading} type="submit"
          className="w-full bg-brass hover:bg-brassdark text-white font-semibold rounded-md py-2.5 text-sm transition">
          {loading ? "Creating your workspace…" : "Create account"}
        </button>

        <p className="text-xs text-ink/50 mt-4 text-center">
          Already have an account? <a href="/login" className="text-brassdark font-semibold">Log in</a>
        </p>
      </form>
    </div>
  );
}
