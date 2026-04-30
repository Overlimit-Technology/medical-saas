import { redirect } from "next/navigation";
import SuperAdminTrials from "@/presentation/superadmin/SuperAdminTrials";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminTrialsPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminTrials data={data} />;
}
