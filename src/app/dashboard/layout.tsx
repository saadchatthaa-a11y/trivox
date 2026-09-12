import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  console.log("DASHBOARD LAYOUT DEBUG — user check:", {
    userFound: !!user,
    userId: user?.id,
    getUserError: getUserError?.message,
  });

  if (!user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("role, organizations(name, plan, subscription_status)")
    .eq("user_id", user.id)
    .single();

  console.log("DASHBOARD LAYOUT DEBUG — membership check:", {
    membershipFound: !!membership,
    membership,
    membershipError: membershipError?.message,
    membershipErrorCode: membershipError?.code,
  });

  if (!membership) redirect("/login");
  const org = (membership as any).organizations;

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} plan={org.plan} status={org.subscription_status} />
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
