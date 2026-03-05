import Sidebar from "@/presentation/common/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <main className="flex-1 px-8 py-8">
        {children}
      </main>
    </div>
  );
}
