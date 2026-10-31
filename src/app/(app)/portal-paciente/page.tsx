import { cookies } from "next/headers";
import PortalSettings from "@/presentation/portal-admin/PortalSettings";
import { readMgSession } from "@/server/auth/mgSession";

export const dynamic = "force-dynamic";

export default async function PortalPacientePage() {
  const session = await readMgSession(cookies().get("mg_session")?.value);
  return <PortalSettings canEdit={session?.role === "ADMIN"} />;
}
