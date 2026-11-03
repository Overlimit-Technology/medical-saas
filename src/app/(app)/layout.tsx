"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/presentation/common/Sidebar";
import PresenceTracker from "@/presentation/common/PresenceTracker";
import NotificationsSidebar from "@/presentation/common/NotificationsSidebar";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const isSuperAdminDashboard = pathname.startsWith("/dashboard/admin");

  if (isSuperAdminDashboard) {
    return (
      <div className="zs-mesh h-screen overflow-hidden text-slate-900">
        <PresenceTracker />
        <main className="h-full min-h-0 min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="zs-mesh flex h-screen overflow-hidden text-slate-900">
      <PresenceTracker />
      <Sidebar mobileOpen={navOpen} onMobileClose={() => setNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Bajo 1024px el menu es un cajon: esta barra lo abre. */}
        <header className="zs-glass mx-3 mt-3 flex h-14 shrink-0 items-center gap-3 rounded-full px-3 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="zs-press grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-sm"
            aria-label="Abrir menú"
            aria-expanded={navOpen}
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <ZensyaLogo size={30} className="h-auto" />
          <span className="font-display text-[16px] font-bold tracking-[-0.3px] text-slate-900">Zensya</span>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-10 pb-16 pt-8 max-lg:px-6 max-sm:px-4 max-sm:pt-5">
          {children}
        </main>
      </div>
      {/* El panel de notificaciones de la derecha solo cabe en pantallas anchas; abajo se usa la página Notificaciones. */}
      <div className="hidden 2xl:flex">
        <NotificationsSidebar />
      </div>
    </div>
  );
}
