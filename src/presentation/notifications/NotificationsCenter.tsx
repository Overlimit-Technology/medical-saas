"use client";

import { Bell, CalendarClock, CircleAlert, CreditCard, MessageSquareMore } from "lucide-react";
import { DEMO_NOTIFICATIONS, type DemoNotification, type DemoNotificationTone } from "./notifications-demo";

function toneStyles(tone: DemoNotificationTone) {
  switch (tone) {
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-sky-100 text-sky-700";
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

export default function NotificationsCenter() {
  const unreadCount = DEMO_NOTIFICATIONS.filter((notification) => notification.unread).length;

  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_42%,#f8fafc_100%)] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200 px-8 pb-7 pt-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                <Bell className="h-3.5 w-3.5" />
                Pantalla exclusiva
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
                Centro de notificaciones
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Mock frontend para visualizar actividad del sistema, alertas clínicas y eventos
                recientes desde una vista dedicada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-[28px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.4)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sin leer</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{unreadCount}</p>
              </div>
              <div className="rounded-[28px] border border-white/80 bg-white/95 px-5 py-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.4)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Eventos</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{DEMO_NOTIFICATIONS.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          {DEMO_NOTIFICATIONS.map((notification) => {
            const Icon = notificationIcon(notification);

            return (
              <article
                key={notification.id}
                className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{notification.title}</h2>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneStyles(notification.tone)}`}
                      >
                        {notification.category}
                      </span>
                      {notification.unread ? (
                        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Nueva
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {notification.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-400">{notification.timeLabel}</span>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Acción demo
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
