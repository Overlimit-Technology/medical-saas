import { Suspense } from "react";
import { redirect } from "next/navigation";
import SuperAdminUserManagement from "@/presentation/superadmin/SuperAdminUserManagement";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function SuperAdminUsuariosPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={<div className="py-6 text-sm text-slate-500">Cargando usuarios...</div>}>
      <SuperAdminUserManagement />
    </Suspense>
  );
}

