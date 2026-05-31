import { redirect } from "next/navigation";
import SuperAdminSettings from "@/presentation/superadmin/SuperAdminSettings";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminConfiguracionPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminSettings data={data} />;
}
