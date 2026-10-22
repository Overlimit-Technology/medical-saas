import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import { ListaTests } from "@/presentation/superadmin/marketing/Experimentos";

export default async function Page() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <ListaTests />;
}
