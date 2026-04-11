import Sidebar from "@/presentation/common/Sidebar";
import PresenceTracker from "@/presentation/common/PresenceTracker";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <PresenceTracker />
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-8 py-8">
        {children}
      </main>
    </div>
  );
}
