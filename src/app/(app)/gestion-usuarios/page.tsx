import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function LegacyGestionUsuariosPage() {
  const session = await requireAuthSession();
  if (session.isSuperAdmin) {
    redirect("/super-admin/usuarios");
  }

  redirect("/dashboard");
}

