import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import Resumen from "@/presentation/superadmin/marketing/Resumen";

export default async function Page() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <Resumen />;
}
