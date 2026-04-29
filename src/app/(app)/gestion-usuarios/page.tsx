import SuperAdminUserManagement from "@/presentation/superadmin/SuperAdminUserManagement";
import { Suspense } from "react";

export default function GestionUsuariosPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Cargando gestión de usuarios...</div>}>
      <SuperAdminUserManagement />
    </Suspense>
  );
}
