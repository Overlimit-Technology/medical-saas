"use client";

import {
  Bell,
  CalendarClock,
  CircleAlert,
  CreditCard,
  MessageSquareMore,
  Sparkles,
  X,
} from "lucide-react";
import type { DemoNotification, DemoNotificationTone } from "@/presentation/notifications/notifications-demo";
import { useNotificationsSidebarViewModel } from "./NotificationsSidebarViewModel";

function toneStyles(tone: DemoNotificationTone) {
  switch (tone) {
    case "success":
      return {
        chip: "bg-emerald-100 text-emerald-700",
        iconWrap: "bg-emerald-50 text-emerald-600",
      };
    case "warning":
      return {
        chip: "bg-amber-100 text-amber-700",
        iconWrap: "bg-amber-50 text-amber-600",
      };
    default:
      return {
        chip: "bg-sky-100 text-sky-700",
        iconWrap: "bg-sky-50 text-sky-600",
      };
  }
}

function notificationIcon(notification: DemoNotification) {
  switch (notification.category) {
    case "Agenda":
      return CalendarClock;
    case "Cobros":
      return CreditCard;
    case "Chat":
      return MessageSquareMore;
    case "Clínica":
    case "Boxes":
      return CircleAlert;
    default:
      return Bell;
  }
}

export default function NotificationsSidebar() {
  const { state, actions } = useNotificationsSidebarViewModel();

  return (
    <>
      <div className="pointer-events-none fixed right-6 top-6 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={actions.togglePanel}
          className="pointer-events-auto inline-flex items-center rounded-full border border-slate-200 bg-white/95 p-3 text-slate-800 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.4)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_30px_60px_-30px_rgba(15,23,42,0.45)]"
          aria-label={state.isOpen ? "Cerrar notificaciones" : "Abrir notificaciones"}
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
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity duration-300 ${
          state.isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={actions.closePanel}
        aria-hidden={!state.isOpen}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-screen w-[380px] max-w-[calc(100vw-24px)] flex-col border-l border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_28%,#f8fafc_100%)] shadow-[0_30px_90px_-40px_rgba(15,23,42,0.45)] transition-transform duration-300 ${
          state.isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!state.isOpen}
      >
        <div className="border-b border-slate-200 px-5 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Centro rápido
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                Notificaciones
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Vista demostrativa global para revisar actividad reciente del sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={actions.closePanel}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              aria-label="Cerrar panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sin leer</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{state.unreadCount}</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Totales</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{state.notifications.length}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {state.notifications.map((notification) => {
              const styles = toneStyles(notification.tone);
              const Icon = notificationIcon(notification);

              return (
                <article
                  key={notification.id}
                  className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrap}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {notification.title}
                            </h3>
                            {notification.unread ? (
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {notification.description}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {notification.timeLabel}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.chip}`}
                        >
                          {notification.category}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
