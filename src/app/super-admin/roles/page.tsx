import { redirect } from "next/navigation";
import SuperAdminModulePlaceholder from "@/presentation/superadmin/SuperAdminModulePlaceholder";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminRolesPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <SuperAdminModulePlaceholder
      title="Roles y Permisos"
      description="Este modulo queda listo para administrar permisos globales de la plataforma."
    />
  );
}

