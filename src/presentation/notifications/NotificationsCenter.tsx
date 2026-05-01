"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarX2,
  CheckCheck,
  CreditCard,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { mapInternalAlertToPanel } from "./internal-alerts.mapper";
import type { NotificationPanelItem } from "./internal-alerts.types";
import { useInternalAlertsFeed } from "./useInternalAlertsFeed";

type NotificationFilter =
  | "all"
  | "unread"
  | "cancelled"
  | "appointments"
  | "payments"
  | "messages"
  | "clinic";

type FilterButton = {
  key: NotificationFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FILTERS: FilterButton[] = [
  { key: "all", label: "Todo", icon: Bell },
  { key: "unread", label: "Sin leer", icon: ShieldAlert },
  { key: "cancelled", label: "Citas canceladas", icon: CalendarX2 },
  { key: "appointments", label: "Agenda", icon: CalendarClock },
  { key: "messages", label: "Mensajes", icon: MessageSquareText },
  { key: "payments", label: "Cobros", icon: CreditCard },
  { key: "clinic", label: "Clinica", icon: Settings2 },
];

const absoluteDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isMessageAlert(item: NotificationPanelItem) {
  const rawText = [
    item.title,
    item.description,
    item.source.referenceType ?? "",
    item.source.eventType,
  ]
    .join(" ")
    .toLowerCase();
  return (
    rawText.includes("mensaje") ||
    rawText.includes("chat") ||
    rawText.includes("whatsapp") ||
    rawText.includes("instagram")
  );
}

function matchesFilter(item: NotificationPanelItem, filter: NotificationFilter) {
  if (filter === "all") return true;
  if (filter === "unread") return !item.isRead;
  if (filter === "cancelled") return item.source.eventType === "APPOINTMENT_CANCELLED";
  if (filter === "appointments") return item.source.eventType.startsWith("APPOINTMENT_");
  if (filter === "payments") return item.source.eventType === "PAYMENT_PENDING";
  if (filter === "clinic") return item.source.eventType === "CUSTOM";
  return isMessageAlert(item);
}

function matchesSearch(item: NotificationPanelItem, term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    item.title,
    item.description,
    item.categoryLabel,
    item.source.eventType,
    ...item.metadata,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

function rowIcon(item: NotificationPanelItem) {
  switch (item.source.eventType) {
    case "APPOINTMENT_CANCELLED":
      return CalendarX2;
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_RESCHEDULED":
    case "APPOINTMENT_CONFLICT":
      return CalendarClock;
    case "PAYMENT_PENDING":
      return CreditCard;
    default:
      return isMessageAlert(item) ? MessageSquareText : Bell;
  }
}

function rowStyle(item: NotificationPanelItem) {
  if (item.source.eventType === "APPOINTMENT_CANCELLED") {
    return {
      iconBg: "bg-rose-100 text-rose-700",
      border: item.isRead ? "border-slate-200" : "border-rose-200",
      badge: "bg-rose-100 text-rose-700",
    };
  }

  if (item.source.eventType === "PAYMENT_PENDING") {
    return {
      iconBg: "bg-amber-100 text-amber-700",
      border: item.isRead ? "border-slate-200" : "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
    };
  }

  if (isMessageAlert(item)) {
    return {
      iconBg: "bg-cyan-100 text-cyan-700",
      border: item.isRead ? "border-slate-200" : "border-cyan-200",
      badge: "bg-cyan-100 text-cyan-700",
    };
  }

  return {
    iconBg: "bg-emerald-100 text-emerald-700",
    border: item.isRead ? "border-slate-200" : "border-emerald-200",
    badge: "bg-slate-100 text-slate-700",
  };
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function NotificationsCenter() {
  const { state, actions } = useInternalAlertsFeed();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => state.alerts.map(mapInternalAlertToPanel), [state.alerts]);

  const counts = useMemo(() => {
    const byFilter = (filter: NotificationFilter) =>
      items.filter((item) => matchesFilter(item, filter)).length;

    return {
      total: items.length,
      unread: byFilter("unread"),
      cancelled: byFilter("cancelled"),
      messages: byFilter("messages"),
      payments: byFilter("payments"),
    };
  }, [items]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) => matchesFilter(item, activeFilter) && matchesSearch(item, search)
      ),
    [items, activeFilter, search]
  );

  const latestUnread = useMemo(
    () => items.filter((item) => !item.isRead).slice(0, 5),
    [items]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Comunicacion interna</p>
            <h1 className="text-2xl font-semibold text-slate-900">Centro de notificaciones</h1>
            <p className="mt-1 text-sm text-slate-600">
              Feed en tiempo real con mensajes, citas canceladas, agenda y cobros.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void actions.refresh({ silent: false });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className={`h-4 w-4 ${state.refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <SummaryStat label="Total" value={counts.total} />
          <SummaryStat label="Sin leer" value={counts.unread} />
          <SummaryStat label="Canceladas" value={counts.cancelled} />
          <SummaryStat label="Mensajes" value={counts.messages} />
          <SummaryStat label="Cobros" value={counts.payments} />
        </div>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {state.error}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por titulo, mensaje, sede o tipo de evento"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => {
                const Icon = filter.icon;
                const active = filter.key === activeFilter;
                const count = items.filter((item) => matchesFilter(item, filter.key)).length;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {filter.label}
                    <span
                      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200">
            {state.loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Inbox className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">
                  No hay notificaciones para este filtro
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ajusta el filtro o la busqueda para ver otros eventos.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const Icon = rowIcon(item);
                  const styles = rowStyle(item);
                  return (
                    <li key={item.id} className="px-3 py-3 sm:px-4">
                      <article className={`rounded-xl border ${styles.border} bg-white p-3`}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">
                                {item.title}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
                              >
                                {item.categoryLabel}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  item.isRead
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-slate-900 text-white"
                                }`}
                              >
                                {item.isRead ? "Leida" : "Nueva"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-600">{item.description}</p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-slate-500">
                                {item.timeLabel} ({absoluteDateFormatter.format(new Date(item.source.createdAt))})
                              </span>
                              {item.metadata.slice(0, 2).map((meta) => (
                                <span
                                  key={meta}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                                >
                                  {meta}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {!item.isRead ? (
                              <button
                                type="button"
                                onClick={() => actions.markAsRead(item.id)}
                                disabled={state.markingIds.includes(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                {state.markingIds.includes(item.id) ? "Guardando..." : "Marcar"}
                              </button>
                            ) : null}

                            {item.href && item.primaryAction ? (
                              <Link
                                href={item.href}
                                className="inline-flex rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
                              >
                                {item.primaryAction}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Sin leer recientes</h2>
            {latestUnread.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No tienes pendientes.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {latestUnread.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="line-clamp-1 text-xs font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.timeLabel}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Accesos rapidos</h2>
            <div className="mt-2 space-y-2">
              <Link
                href="/agenda"
                className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Ver agenda del dia
              </Link>
              <Link
                href="/crm"
                className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Revisar CRM y cobros
              </Link>
              <button
                type="button"
                onClick={() => {
                  void actions.refresh({ silent: false });
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Forzar sincronizacion
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
