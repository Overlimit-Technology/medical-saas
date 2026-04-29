import PresenceTracker from "@/presentation/common/PresenceTracker";
import NotificationsSidebar from "@/presentation/common/NotificationsSidebar";
import SuperAdminSidebar from "@/presentation/superadmin/SuperAdminSidebar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <PresenceTracker />
      <SuperAdminSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6">
        {children}
      </main>
      <NotificationsSidebar />
    </div>
  );
}

