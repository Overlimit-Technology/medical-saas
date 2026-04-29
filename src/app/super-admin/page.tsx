import { redirect } from "next/navigation";
import SuperAdminOverview from "@/presentation/superadmin/SuperAdminOverview";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminOverviewPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return <SuperAdminOverview />;
}

