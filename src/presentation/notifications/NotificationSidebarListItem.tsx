"use client";

import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CreditCard,
} from "lucide-react";
import type { NotificationPanelItem, NotificationPanelTone } from "./internal-alerts.types";

function resolveToneStyles(tone: NotificationPanelTone) {
  switch (tone) {
    case "info":
      return {
        dot: "bg-cyan-500",
        icon: "bg-amber-50 text-amber-500",
        badge: "bg-sky-100 text-sky-700",
      };
    case "warning":
      return {
        dot: "bg-rose-500",
        icon: "bg-rose-50 text-rose-500",
        badge: "bg-amber-100 text-amber-700",
      };
    default:
      return {
        dot: "bg-emerald-500",
        icon: "bg-emerald-50 text-emerald-500",
        badge: "bg-slate-100 text-slate-700",
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

type NotificationSidebarListItemProps = {
  item: NotificationPanelItem;
  isMarking: boolean;
  onMarkAsRead: (alertId: string) => void;
};

export default function NotificationSidebarListItem({
  item,
  isMarking,
  onMarkAsRead,
}: NotificationSidebarListItemProps) {
  const styles = resolveToneStyles(item.tone);
  const Icon = resolveIcon(item);
  const metadataLine = item.metadata.join(" • ");

  return (
    <article className="group relative rounded-[18px] border border-slate-200/80 bg-white px-3 py-3 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.22)] transition hover:border-slate-300 hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.24)]">
      <span
        className={`absolute left-2 top-5 h-2 w-2 rounded-full ${
          item.isRead ? "bg-slate-200" : styles.dot
        }`}
      />

      <div className="flex gap-3 pl-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[14px] font-semibold leading-5 text-slate-900">
                  {item.title}
                </h3>
                {!item.isRead ? (
                  <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                ) : null}
              </div>

              <p className="mt-1 text-[13px] leading-5 text-slate-600 line-clamp-2">
                {item.description}
              </p>
            </div>

            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400">
              {item.timeLabel}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
              {item.categoryLabel}
            </span>
            {metadataLine ? (
              <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{metadataLine}</p>
            ) : (
              <span className="text-[11px] text-slate-300">•</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {!item.isRead ? (
              <button
                type="button"
                onClick={() => onMarkAsRead(item.id)}
                disabled={isMarking}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCheck className="h-3 w-3" />
                {isMarking ? "Guardando..." : "Marcar leída"}
              </button>
            ) : null}

            {item.href && item.primaryAction ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 transition hover:text-slate-900"
              >
                {item.primaryAction}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
