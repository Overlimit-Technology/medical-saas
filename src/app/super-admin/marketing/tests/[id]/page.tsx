import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import { DetalleTest } from "@/presentation/superadmin/marketing/Experimentos";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <DetalleTest id={params.id} />;
}
