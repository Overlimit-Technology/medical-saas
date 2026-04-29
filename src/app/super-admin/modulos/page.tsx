import { redirect } from "next/navigation";
import SuperAdminModulePlaceholder from "@/presentation/superadmin/SuperAdminModulePlaceholder";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminModulosPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <SuperAdminModulePlaceholder
      title="Acceso a Modulos"
      description="Aqui puedes definir que modulos estaran habilitados por clinica o por plan."
    />
  );
}

