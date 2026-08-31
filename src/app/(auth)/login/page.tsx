"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-6">Log in</h1>
        {error && <div className="text-sm text-rust bg-rust/10 border border-rust/30 rounded-md p-3 mb-4">{error}</div>}
        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-4 text-sm" />
        <label className="block text-xs font-bold uppercase tracking-wide text-ink/60 mb-1">Password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 mb-6 text-sm" />
        <button disabled={loading} type="submit"
          className="w-full bg-brass hover:bg-brassdark text-white font-semibold rounded-md py-2.5 text-sm transition">
          {loading ? "Logging in…" : "Log in"}
        </button>
        <p className="text-xs text-ink/50 mt-4 text-center">
          No account? <a href="/signup" className="text-brassdark font-semibold">Start a free trial</a>
        </p>
      </form>
    </div>
  );
}
