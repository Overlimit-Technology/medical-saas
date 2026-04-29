import { redirect } from "next/navigation";
import AdminDashboard from "@/presentation/dashboard/AdminDashboard";
import { requireAuthSession } from "@/server/auth/requireSession";

export default async function AdminDashboardPage() {
  const session = await requireAuthSession();
  if (session.isSuperAdmin) {
    redirect("/super-admin");
  }
  return <AdminDashboard />;
}
