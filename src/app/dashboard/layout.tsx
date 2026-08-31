import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations(name, plan, subscription_status)")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/login");
  const org = (membership as any).organizations;

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} plan={org.plan} status={org.subscription_status} />
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
