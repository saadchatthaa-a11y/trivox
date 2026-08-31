"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Sidebar({ orgName, plan, status }: { orgName: string; plan: string; status: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const link = (href: string, label: string) => (
    <Link href={href}
      className={`block px-3 py-2 rounded-md text-sm font-medium ${pathname === href ? "bg-brass/15 text-brassdark" : "text-ink/70 hover:bg-ink/5"}`}>
      {label}
    </Link>
  );

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 border-r border-line bg-white p-5 flex flex-col">
      <div className="mb-8">
        <div className="font-serif font-semibold text-lg">{orgName}</div>
        <div className="text-xs text-ink/50 capitalize">{plan} plan · {status}</div>
      </div>
      <nav className="space-y-1 flex-1">
        {link("/dashboard", "Pipeline")}
        {link("/dashboard/campaigns", "AI Campaigns")}
        {link("/dashboard/settings/billing", "Billing")}
      </nav>
      <button onClick={logout} className="text-xs text-ink/50 hover:text-ink text-left mt-6">Log out</button>
    </aside>
  );
}
