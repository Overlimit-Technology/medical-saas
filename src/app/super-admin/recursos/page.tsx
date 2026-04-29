import { redirect } from "next/navigation";
import SuperAdminModulePlaceholder from "@/presentation/superadmin/SuperAdminModulePlaceholder";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminRecursosPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <SuperAdminModulePlaceholder
      title="Recursos"
      description="Repositorio central para documentos, plantillas y recursos administrativos."
    />
  );
}

