import { redirect } from "next/navigation";
import SuperAdminBilling from "@/presentation/superadmin/SuperAdminBilling";
import { requireAuthSession } from "@/server/auth/requireSession";
import { getBillingMetrics } from "@/server/super-admin/billingMetrics";

export const dynamic = "force-dynamic";

export default async function SuperAdminBillingPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const data = await getBillingMetrics();
  return <SuperAdminBilling data={data} />;
}
