import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import Paginas from "@/presentation/superadmin/marketing/Paginas";

export default async function Page() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <Paginas />;
}
