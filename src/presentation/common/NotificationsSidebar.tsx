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
          className="h-14 animate-pulse rounded-[18px] bg-white/75"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-3 py-3">
      <div className="rounded-[22px] bg-white px-4 py-5 text-left shadow-[0_18px_40px_-36px_rgba(15,23,42,0.35)]">
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dff8f4,#effcf8)] text-[#129f97]">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Notificaciones
            </h2>
          </div>
          <p className="mt-2 pl-10 text-[11px] leading-4 text-slate-500">
            Resumen corto y reciente
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#17c2b2]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#129f97]">
              {unreadCount}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Actualizar notificaciones"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Ocultar sidebar de notificaciones"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
        <h3 className="text-[11px] font-medium text-slate-500">{title}</h3>
      </div>

      {items.length > 0 ? (
        <div className="space-y-0.5 rounded-[24px] bg-white/70 px-1.5 py-1.5 shadow-[0_20px_48px_-42px_rgba(15,23,42,0.32)] backdrop-blur-sm">
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
        <div className="rounded-[20px] bg-white px-3.5 py-3 text-[11px] leading-5 text-slate-500 shadow-[0_16px_32px_-30px_rgba(15,23,42,0.24)]">
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

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f5f9fc_0%,#f8fafc_20%,#f3f7fb_100%)] pb-2">
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
        className={`fixed right-0 top-0 z-50 flex h-screen w-[292px] max-w-[calc(100vw-14px)] flex-col border-l border-slate-200/60 bg-[linear-gradient(180deg,#f7fbfd_0%,#f4f8fb_100%)] shadow-[0_30px_90px_-40px_rgba(15,23,42,0.32)] transition-transform duration-300 xl:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
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
          className="fixed right-4 top-24 z-40 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] transition hover:border-slate-300 hover:text-slate-900 xl:flex"
          aria-label="Mostrar sidebar de notificaciones"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <aside
        className={`hidden h-screen shrink-0 overflow-hidden bg-white transition-[width,border-color] duration-300 xl:flex xl:flex-col ${
          isDesktopCollapsed
            ? "w-0 border-l border-transparent"
            : "w-[292px] border-l border-slate-200/60 bg-[linear-gradient(180deg,#f7fbfd_0%,#f4f8fb_100%)]"
        }`}
        aria-hidden={isDesktopCollapsed}
      >
        <div
          className={`flex h-full min-h-0 flex-col transition-opacity duration-200 ${
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
          animation: notificationsSidebarItemIn 280ms ease-out both;
        }
      `}</style>
    </>
  );
}
