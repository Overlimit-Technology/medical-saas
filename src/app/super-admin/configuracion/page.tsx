import { redirect } from "next/navigation";
import SuperAdminModulePlaceholder from "@/presentation/superadmin/SuperAdminModulePlaceholder";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminConfiguracionPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <SuperAdminModulePlaceholder
      title="Configuracion"
      description="Ajustes globales del entorno super admin y preferencias de plataforma."
    />
  );
}

