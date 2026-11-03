"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Inbox, RefreshCw, X } from "lucide-react";
import NotificationSidebarListItem from "@/presentation/notifications/NotificationSidebarListItem";
import { buildNotificationSidebarSections } from "@/presentation/notifications/internal-alerts.mapper";
import { useInternalAlertsFeed } from "@/presentation/notifications/useInternalAlertsFeed";

function LoadingState() {
  return (
    <div className="space-y-1 px-3 py-2.5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-[18px] bg-white/60"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-3 py-3">
      <div className="zs-glass-inner rounded-[22px] px-4 py-5 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-4 w-4" />
        </div>
        <h3 className="mt-3 text-[13px] font-medium text-slate-900">Todo tranquilo</h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

type SidebarHeaderProps = {
  unreadCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
};

function SidebarHeader({
  unreadCount,
  refreshing,
  onRefresh,
  onClose,
  onCollapse,
}: SidebarHeaderProps) {
  return (
    <div className="px-4 pb-2 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#50c9d5]/30 bg-gradient-to-br from-[#50c9d5]/20 to-[#50c9d5]/[0.06] text-[#17656c]">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="font-display text-[15px] font-bold tracking-[-0.3px] text-slate-900">
              Notificaciones
            </h2>
          </div>
          <p className="mt-2 pl-10 text-[11px] leading-4 text-slate-500">
            Resumen corto y reciente
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#e8a020]/[0.14] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5a0b]">
              {unreadCount}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 active:scale-95"
            aria-label="Actualizar notificaciones"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 active:scale-95"
              aria-label="Ocultar sidebar de notificaciones"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900 active:scale-95"
              aria-label="Cerrar panel"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type SidebarSectionProps = {
  title: string;
  emptyMessage: string;
  items: ReturnType<typeof buildNotificationSidebarSections>["unread"];
  markingIds: string[];
  onMarkAsRead: (alertId: string) => void;
};

function SidebarSection({
  title,
  emptyMessage,
  items,
  markingIds,
  onMarkAsRead,
}: SidebarSectionProps) {
  return (
    <section className="px-3 pb-1 pt-3">
      <div className="mb-2 px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      </div>

      {items.length > 0 ? (
        <div className="zs-glass-inner space-y-0.5 rounded-[24px] px-1.5 py-1.5">
          {items.map((item, index) => (
            <NotificationSidebarListItem
              key={item.id}
              item={item}
              isMarking={markingIds.includes(item.id)}
              onMarkAsRead={onMarkAsRead}
              style={
                {
                  animationDelay: `${index * 45}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : (
        <div className="zs-glass-inner rounded-[20px] px-3.5 py-3 text-[11px] leading-5 text-slate-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

type SidebarContentProps = {
  unreadCount: number;
  hasVisibleAlerts: boolean;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  unreadItems: ReturnType<typeof buildNotificationSidebarSections>["unread"];
  recentItems: ReturnType<typeof buildNotificationSidebarSections>["recent"];
  markingIds: string[];
  onRefresh: () => void;
  onMarkAsRead: (alertId: string) => void;
  onClose?: () => void;
  onCollapse?: () => void;
};

function SidebarContent({
  unreadCount,
  hasVisibleAlerts,
  error,
  loading,
  refreshing,
  unreadItems,
  recentItems,
  markingIds,
  onRefresh,
  onMarkAsRead,
  onClose,
  onCollapse,
}: SidebarContentProps) {
  const hasUnread = unreadItems.length > 0;
  const hasRecent = recentItems.length > 0;

  return (
    <>
      <SidebarHeader
        unreadCount={unreadCount}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onClose={onClose}
        onCollapse={onCollapse}
      />

      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {loading ? (
          <LoadingState />
        ) : !hasVisibleAlerts && error ? (
          <div className="px-3 py-3">
            <div className="rounded-[20px] bg-rose-50 px-3.5 py-3 text-[11px] leading-5 text-rose-700">
              {error}
            </div>
          </div>
        ) : !hasVisibleAlerts ? (
          <EmptyState message="Cuando el sistema genere alertas internas importantes, aparecerán aquí." />
        ) : (
          <>
            {error ? (
              <div className="px-3 pt-2.5">
                <div className="rounded-[18px] bg-amber-50 px-3.5 py-2.5 text-[11px] leading-5 text-amber-800">
                  {error}
                </div>
              </div>
            ) : null}

            {hasUnread ? (
              <SidebarSection
                title="Nuevo"
                emptyMessage="No hay alertas pendientes por leer."
                items={unreadItems}
                markingIds={markingIds}
                onMarkAsRead={onMarkAsRead}
              />
            ) : hasRecent ? (
              <div className="px-3 pb-1 pt-2.5">
                <div className="rounded-[18px] bg-emerald-50 px-3.5 py-2.5 text-[11px] font-medium text-emerald-700">
                  Todo al día. No tienes alertas sin leer.
                </div>
              </div>
            ) : null}

            {hasRecent ? (
              <SidebarSection
                title="Actividad"
                emptyMessage="Aún no hay historial reciente para mostrar."
                items={recentItems}
                markingIds={markingIds}
                onMarkAsRead={onMarkAsRead}
              />
            ) : hasUnread ? null : (
              <div className="px-4 py-2.5 text-[11px] text-slate-500">
                No hay historial reciente para mostrar.
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-transparent px-4 py-2.5">
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1 rounded-full px-1 text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          Ver bandeja completa
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </>
  );
}

export default function NotificationsSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const { state, actions } = useInternalAlertsFeed();

  const isNotificationsPage =
    pathname === "/notifications" || pathname.startsWith("/notifications/");
  const sections = useMemo(
    () => buildNotificationSidebarSections(state.alerts, 20),
    [state.alerts]
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isNotificationsPage) {
      setIsDesktopCollapsed(false);
    }
  }, [isNotificationsPage]);

  if (isNotificationsPage) {
    return null;
  }

  const hasVisibleAlerts = sections.unread.length > 0 || sections.recent.length > 0;

  return (
    <>
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex xl:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="pointer-events-auto inline-flex items-center rounded-full border border-slate-200 bg-white/95 p-3 text-slate-800 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.4)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)]"
          aria-label={isOpen ? "Cerrar notificaciones" : "Abrir notificaciones"}
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff7ed,#ffedd5)] text-amber-600">
            <Bell className="h-5 w-5" />
            {state.unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">
                {state.unreadCount}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity duration-300 xl:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <aside
        className={`zs-glass-strong fixed bottom-3 right-3 top-3 z-50 flex w-[292px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[28px] transition-transform duration-[400ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] xl:hidden ${
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+24px)]"
        }`}
        aria-hidden={!isOpen}
      >
        <SidebarContent
          unreadCount={state.unreadCount}
          hasVisibleAlerts={hasVisibleAlerts}
          error={state.error}
          loading={state.loading}
          refreshing={state.refreshing}
          unreadItems={sections.unread}
          recentItems={sections.recent}
          markingIds={state.markingIds}
          onRefresh={() => {
            void actions.refresh({ silent: true });
          }}
          onMarkAsRead={actions.markAsRead}
          onClose={() => setIsOpen(false)}
        />
      </aside>

      {isDesktopCollapsed ? (
        <button
          type="button"
          onClick={() => setIsDesktopCollapsed(false)}
          className="zs-glass zs-press fixed right-4 top-24 z-40 hidden h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:text-slate-900 xl:flex"
          aria-label="Mostrar sidebar de notificaciones"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <aside
        className={`hidden h-screen shrink-0 overflow-hidden transition-[width,padding] duration-[400ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] xl:flex xl:flex-col ${
          isDesktopCollapsed ? "w-0 p-0" : "w-[316px] py-3 pr-3"
        }`}
        aria-hidden={isDesktopCollapsed}
      >
        <div
          className={`zs-glass flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] transition-opacity duration-200 ${
            isDesktopCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <SidebarContent
            unreadCount={state.unreadCount}
            hasVisibleAlerts={hasVisibleAlerts}
            error={state.error}
            loading={state.loading}
            refreshing={state.refreshing}
            unreadItems={sections.unread}
            recentItems={sections.recent}
            markingIds={state.markingIds}
            onRefresh={() => {
              void actions.refresh({ silent: true });
            }}
            onMarkAsRead={actions.markAsRead}
            onCollapse={() => setIsDesktopCollapsed(true)}
          />
        </div>
      </aside>
      <style jsx global>{`
        @keyframes notificationsSidebarItemIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notifications-sidebar-item {
          animation: notificationsSidebarItemIn 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
      `}</style>
    </>
  );
}
