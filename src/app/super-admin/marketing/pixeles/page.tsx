import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import Pixeles from "@/presentation/superadmin/marketing/Pixeles";

export default async function Page() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <Pixeles />;
}
