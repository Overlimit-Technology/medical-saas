import { cookies } from "next/headers";
import AdminOverview from "@/presentation/dashboard/AdminOverview";
import ClinicDashboard from "@/presentation/dashboard/ClinicDashboard";
import { readMgSession } from "@/server/auth/mgSession";

export const dynamic = "force-dynamic";

// El admin de la sede aterriza en la vista general (citas, pacientes, leads e ingresos).
// "Mi clinica" (modulos y perfil de la sede) vive en /clinic-dashboard/clinica.
export default async function ClinicDashboardPage() {
  const session = await readMgSession(cookies().get("mg_session")?.value);
  return session?.role === "ADMIN" ? <AdminOverview /> : <ClinicDashboard />;
}
