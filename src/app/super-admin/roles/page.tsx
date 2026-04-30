import { redirect } from "next/navigation";
import SuperAdminRoles from "@/presentation/superadmin/SuperAdminRoles";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminRolesPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminRoles data={data} />;
}
