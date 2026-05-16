import { redirect } from "next/navigation";
import SuperAdminUsers from "@/presentation/superadmin/SuperAdminUsers";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminUsuariosPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminUsers data={data} />;
}
