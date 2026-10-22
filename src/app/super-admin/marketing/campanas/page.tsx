import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import { ListaCampanas } from "@/presentation/superadmin/marketing/Campanas";

export default async function Page() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <ListaCampanas />;
}
