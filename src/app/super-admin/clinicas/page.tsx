import { redirect } from "next/navigation";
import SuperAdminClinics from "@/presentation/superadmin/SuperAdminClinics";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getSuperAdminPlatformData } from "@/server/super-admin/platformData";

export default async function SuperAdminClinicasPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getSuperAdminPlatformData();
  return <SuperAdminClinics data={data} />;
}
