"use client";

import { Bell, Inbox, RefreshCw } from "lucide-react";
import NotificationPanelCard from "./NotificationPanelCard";
import { mapInternalAlertToPanel } from "./internal-alerts.mapper";
import { useInternalAlertsFeed } from "./useInternalAlertsFeed";

export default function NotificationsCenter() {
  const { state, actions } = useInternalAlertsFeed();
  const items = state.alerts.map(mapInternalAlertToPanel);

  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_42%,#f8fafc_100%)] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 px-8 pb-7 pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                <Bell className="h-3.5 w-3.5" />
                Bandeja histórica
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
                Centro de notificaciones
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Historial completo de alertas internas del usuario, ordenado por fecha descendente
                y conectado a los eventos reales del sistema.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto lg:grid-cols-3">
              <div className="rounded-[28px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.4)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sin leer</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{state.unreadCount}</p>
              </div>
              <div className="rounded-[28px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.4)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Eventos</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{items.length}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void actions.refresh({ silent: false });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[28px] border border-white/80 bg-white/95 px-5 py-4 text-sm font-medium text-slate-700 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.4)] transition hover:text-slate-900"
              >
                <RefreshCw className={`h-4 w-4 ${state.refreshing ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          </div>

          {state.error ? (
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {state.error}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-6">
          {state.loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-48 animate-pulse rounded-[30px] border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Inbox className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">No hay alertas todavía</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Esta bandeja mostrará el historial completo cuando el sistema genere nuevas
                notificaciones internas.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <NotificationPanelCard
                  key={item.id}
                  item={item}
                  isMarking={state.markingIds.includes(item.id)}
                  onMarkAsRead={actions.markAsRead}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
