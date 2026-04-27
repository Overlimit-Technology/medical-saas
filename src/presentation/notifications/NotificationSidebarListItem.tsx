"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Bell,
  CalendarClock,
  CheckCheck,
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
      };
    case "warning":
      return {
        dot: "bg-rose-500",
        icon: "bg-rose-50 text-rose-500",
      };
    default:
      return {
        dot: "bg-emerald-500",
        icon: "bg-emerald-50 text-emerald-500",
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
  style?: CSSProperties;
};

export default function NotificationSidebarListItem({
  item,
  isMarking,
  onMarkAsRead,
  style,
}: NotificationSidebarListItemProps) {
  const styles = resolveToneStyles(item.tone);
  const Icon = resolveIcon(item);
  const secondaryText = item.description?.trim() || item.metadata[0] || item.categoryLabel;
  const summary = (
    <>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${styles.icon}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[12px] font-medium leading-4 text-slate-900 transition-colors group-hover:text-slate-950">
                {item.title}
              </h3>
              {!item.isRead ? (
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
              ) : null}
            </div>

            {secondaryText ? (
              <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-500">
                {secondaryText}
              </p>
            ) : null}
          </div>

          <span className="shrink-0 whitespace-nowrap pl-1 text-[10px] font-medium text-slate-400">
            {item.timeLabel}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <article
      className="notifications-sidebar-item group rounded-[18px] bg-white/80 px-2 py-2 transition-all duration-200 hover:bg-white hover:shadow-[0_12px_24px_-24px_rgba(15,23,42,0.28)]"
      style={style}
    >
      {item.href ? (
        <Link href={item.href} className="flex items-start gap-2.5">
          {summary}
        </Link>
      ) : (
        <div className="flex items-start gap-2.5">{summary}</div>
      )}

      {!item.isRead ? (
        <div className="mt-1.5 pl-[42px]">
          <button
            type="button"
            onClick={() => onMarkAsRead(item.id)}
            disabled={isMarking}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-3 w-3" />
            {isMarking ? "Guardando..." : "Marcar leída"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
