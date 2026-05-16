import { Suspense } from "react";
import SuperAdminUserManagement from "@/presentation/superadmin/SuperAdminUserManagement";

export default function GestionUsuariosPage() {
  return (
    <Suspense fallback={null}>
      <SuperAdminUserManagement />
    </Suspense>
  );
}

