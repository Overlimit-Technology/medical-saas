"use client";

import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CircleAlert,
  CreditCard,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import type { NotificationPanelItem, NotificationPanelTone } from "./internal-alerts.types";

function resolveToneStyles(tone: NotificationPanelTone) {
  switch (tone) {
    case "info":
      return {
        badge: "bg-sky-100 text-sky-700",
        icon: "bg-sky-50 text-sky-600",
      };
    case "warning":
      return {
        badge: "bg-amber-100 text-amber-700",
        icon: "bg-amber-50 text-amber-600",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700",
        icon: "bg-slate-100 text-slate-600",
      };
  }
}

function resolveIcon(item: NotificationPanelItem) {
  switch (item.categoryLabel) {
    case "Agenda":
      return CalendarClock;
    case "Cobros":
      return CreditCard;
    case "Clínica":
      return CircleAlert;
    default:
      return Bell;
  }
}

type NotificationPanelCardProps = {
  item: NotificationPanelItem;
  isMarking: boolean;
  onMarkAsRead: (alertId: string) => void;
};

export default function NotificationPanelCard({
  item,
  isMarking,
  onMarkAsRead,
}: NotificationPanelCardProps) {
  const styles = resolveToneStyles(item.tone);
  const Icon = resolveIcon(item);

  return (
    <article
      className={`rounded-[28px] border bg-white p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.28)] transition ${
        item.isRead ? "border-slate-200" : "border-amber-200 bg-amber-50/30"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                {!item.isRead ? (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>

            <span className="shrink-0 text-xs text-slate-400">{item.timeLabel}</span>
          </div>

          {item.metadata.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.metadata.map((meta) => (
                <span
                  key={meta}
                  className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {meta}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}
              >
                {item.categoryLabel}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  item.isRead ? "bg-slate-100 text-slate-500" : "bg-slate-900 text-white"
                }`}
              >
                {item.isRead ? "Leída" : "Nueva"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!item.isRead ? (
                <button
                  type="button"
                  onClick={() => onMarkAsRead(item.id)}
                  disabled={isMarking}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCheck className="h-4 w-4" />
                  {isMarking ? "Guardando..." : "Marcar como leída"}
                </button>
              ) : null}

              {item.href && item.primaryAction ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {item.primaryAction}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
