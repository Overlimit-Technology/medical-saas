import PresenceTracker from "@/presentation/common/PresenceTracker";
//import NotificationsSidebar from "@/presentation/common/NotificationsSidebar";
import SuperAdminSidebar from "@/presentation/superadmin/SuperAdminSidebar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 md:h-screen md:flex-row md:overflow-hidden">
      <PresenceTracker />
      <SuperAdminSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden px-4 py-4 md:overflow-y-auto md:px-6 md:py-6">
        {children}
      </main>
      {/* <NotificationsSidebar /> */}
    </div>
  );
}

