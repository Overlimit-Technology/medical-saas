import { redirect } from "next/navigation";
import SuperAdminModulePlaceholder from "@/presentation/superadmin/SuperAdminModulePlaceholder";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminTrialsPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <SuperAdminModulePlaceholder
      title="Trials"
      description="Gestiona vencimientos y seguimiento de periodos de prueba desde este panel."
    />
  );
}

