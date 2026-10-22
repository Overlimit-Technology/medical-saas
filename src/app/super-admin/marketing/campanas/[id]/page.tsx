import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/requireSession";
import { DetalleCampana } from "@/presentation/superadmin/marketing/Campanas";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return <DetalleCampana id={params.id} />;
}
