import { cookies } from "next/headers";
import ClinicDashboard from "@/presentation/dashboard/ClinicDashboard";
import CustomDashboard from "@/presentation/dashboard/custom/CustomDashboard";
import { readMgSession } from "@/server/auth/mgSession";

export const dynamic = "force-dynamic";

// El admin de la sede aterriza en su panel personalizable (widgets, graficos y periodos a eleccion).
// "Mi clinica" (modulos y perfil de la sede) vive en /clinic-dashboard/clinica.
export default async function ClinicDashboardPage() {
  const session = await readMgSession(cookies().get("mg_session")?.value);
  return session?.role === "ADMIN" ? <CustomDashboard /> : <ClinicDashboard />;
}
