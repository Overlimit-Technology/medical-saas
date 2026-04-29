import Sidebar from "@/presentation/common/Sidebar";
import PresenceTracker from "@/presentation/common/PresenceTracker";
import NotificationsSidebar from "@/presentation/common/NotificationsSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <PresenceTracker />
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-8">
        {children}
      </main>
      <NotificationsSidebar />
    </div>
  );
}
