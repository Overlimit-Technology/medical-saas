import { redirect } from "next/navigation";
import SuperAdminDashboard from "@/presentation/superadmin/SuperAdminDashboard";
import { requireAuthSession } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return <SuperAdminDashboard />;
}
