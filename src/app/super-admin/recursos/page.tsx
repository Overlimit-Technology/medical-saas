import { redirect } from "next/navigation";
import SuperAdminResources from "@/presentation/superadmin/SuperAdminResources";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminRecursosPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminResources data={data} />;
}
