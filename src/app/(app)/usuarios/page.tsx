import { cookies } from "next/headers";
import Doctors from "@/presentation/doctors/Doctors";
import { readMgSession } from "@/server/auth/mgSession";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Los equipos los crea y borra solo el admin (igual que la API /api/team-categories).
  const session = await readMgSession(cookies().get("mg_session")?.value);
  return <Doctors canEditTeams={session?.role === "ADMIN"} />;
}
