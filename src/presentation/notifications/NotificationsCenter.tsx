"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCheck,
  CreditCard,
  KanbanSquare,
  MessageSquareText,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Card, EmptyState, IconBox, Notice, PageHead, Stat, StatusPill, View, btnClass, zs, type Tone } from "@/presentation/ui/zs";
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

// Lo que necesita accion va arriba: mantenciones y avisos de la clinica, choques de agenda,
// pacientes que llegaron, cobros pendientes y cancelaciones. Solo los no leidos.
const PRIORITY: Array<NotificationPanelItem["source"]["eventType"]> = [
  "CUSTOM",
  "APPOINTMENT_CONFLICT",
  "PATIENT_ARRIVED",
  "PAYMENT_PENDING",
  "APPOINTMENT_CANCELLED",
];

function rowTone(item: NotificationPanelItem): { box: "accent" | "warn" | "err"; pill: Tone } {
  switch (item.source.eventType) {
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_CONFLICT":
      return { box: "err", pill: "err" };
    case "PAYMENT_PENDING":
    case "CUSTOM":
      return { box: "warn", pill: "warn" };
    default:
      return { box: "accent", pill: "ok" };
  }
}

function priorityIcon(item: NotificationPanelItem) {
  if (item.source.eventType === "CUSTOM") {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return /manten|revisi|equipo|maquina|máquina/.test(text) ? Wrench : Settings2;
  }
  if (item.source.eventType === "PATIENT_ARRIVED") return UserCheck;
  return rowIcon(item);
}

const PRIORITY_CARD: Record<"accent" | "warn" | "err", string> = {
  err: "border-[#e5484d]/30 bg-[#e5484d]/[0.04]",
  warn: "border-[#e8a020]/35 bg-[#e8a020]/[0.06]",
  accent: "border-[#50c9d5]/30 bg-[#50c9d5]/[0.06]",
};

export default function NotificationsCenter() {
  const { state, actions } = useInternalAlertsFeed();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => state.alerts.map(mapInternalAlertToPanel), [state.alerts]);

  const countFor = (filter: NotificationFilter) => items.filter((item) => matchesFilter(item, filter)).length;

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item, activeFilter) && matchesSearch(item, search)),
    [items, activeFilter, search]
  );

  const important = useMemo(
    () =>
      items
        .filter((item) => !item.isRead && PRIORITY.includes(item.source.eventType))
        .sort((a, b) => PRIORITY.indexOf(a.source.eventType) - PRIORITY.indexOf(b.source.eventType))
        .slice(0, 6),
    [items]
  );

  const markButton = (item: NotificationPanelItem) =>
    !item.isRead ? (
      <button
        type="button"
        onClick={() => actions.markAsRead(item.id)}
        disabled={state.markingIds.includes(item.id)}
        className={btnClass("quiet", "sm")}
      >
        <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
        {state.markingIds.includes(item.id) ? "Guardando…" : "Marcar leída"}
      </button>
    ) : null;

  return (
    <View label="Notificaciones" wide>
      <PageHead
        tag="Notificaciones"
        title="Lo que necesita"
        accent="tu atención"
        lead="Primero lo importante; abajo, todo lo que pasó en la clínica."
        actions={
          <>
            <Link href="/agenda" className={btnClass("quiet", "sm")}>
              <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
              Agenda del día
            </Link>
            <Link href="/crm" className={btnClass("quiet", "sm")}>
              <KanbanSquare className="h-4 w-4" strokeWidth={1.8} />
              CRM y cobros
            </Link>
            <button type="button" onClick={() => void actions.refresh({ silent: false })} className={btnClass("primary", "sm")}>
              <RefreshCw className={`h-4 w-4 ${state.refreshing ? "animate-spin" : ""}`} strokeWidth={1.8} />
              Actualizar
            </button>
          </>
        }
      />

      {state.error ? <Notice tone="err">{state.error}</Notice> : null}

      <Card
        title={
          <>
            Alertas importantes{" "}
            {important.length ? <StatusPill tone="warn">{important.length} por revisar</StatusPill> : <StatusPill tone="ok">Al día</StatusPill>}
          </>
        }
      >
        {important.length ? (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {important.map((item) => {
              const tone = rowTone(item);
              return (
                <li key={item.id} className={`flex flex-col gap-3 rounded-[20px] border p-4 ${PRIORITY_CARD[tone.box]}`}>
                  <div className="flex items-start gap-3">
                    <IconBox icon={priorityIcon(item)} tone={tone.box} />
                    <div className="min-w-0 flex-1">
                      <b className="block font-display text-[15px] font-semibold text-slate-900">{item.title}</b>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-600">{item.description}</p>
                      <span className="mt-1 block text-[12px] text-slate-500">{item.timeLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.href && item.primaryAction ? (
                      <Link href={item.href} className={btnClass("primary", "sm")}>
                        {item.primaryAction}
                      </Link>
                    ) : null}
                    {markButton(item)}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No hay nada urgente">
            Las mantenciones, choques de agenda, llegadas y cobros pendientes aparecerán aquí.
          </EmptyState>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sin leer" value={countFor("unread")} icon={ShieldAlert} />
        <Stat label="Canceladas" value={countFor("cancelled")} icon={CalendarX2} />
        <Stat label="Cobros" value={countFor("payments")} icon={CreditCard} />
        <Stat label="Mensajes" value={countFor("messages")} icon={MessageSquareText} />
      </div>

      <Card title="Todo lo que pasó">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white/60 p-[5px]"
            role="tablist"
            aria-label="Filtros"
          >
            {FILTERS.map((filter) => {
              const Icon = filter.icon;
              const active = filter.key === activeFilter;
              return (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
                    active ? "bg-[#50c9d5] text-[#080b04]" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                  <span className={`rounded-full px-[7px] py-px text-[11px] font-semibold ${active ? "bg-[#0d1b2a]/10" : "bg-slate-100"}`}>
                    {countFor(filter.key)}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="relative block min-w-[240px] flex-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por paciente, profesional o sede"
              className={`${zs.input} rounded-full pl-10`}
            />
          </label>
        </div>

        {state.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState title="No hay notificaciones con este filtro">Prueba con otro filtro o búsqueda.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {visibleItems.map((item) => {
              const Icon = rowIcon(item);
              const tone = rowTone(item);
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 py-3.5 first:border-t-0 first:pt-0 ${item.isRead ? "opacity-70" : ""}`}
                >
                  <IconBox icon={Icon} tone={tone.box} />
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="font-display text-[14.5px] font-semibold text-slate-900">{item.title}</b>
                      <StatusPill tone={item.isRead ? "off" : tone.pill}>{item.isRead ? "Leída" : item.categoryLabel}</StatusPill>
                    </div>
                    <p className="mt-0.5 text-[13.5px] text-slate-600">{item.description}</p>
                    <span className="mt-1 block text-[12px] text-slate-500">
                      {item.timeLabel} · {absoluteDateFormatter.format(new Date(item.source.createdAt))}
                      {item.metadata
                        .slice(0, 2)
                        .map((meta) => ` · ${meta}`)
                        .join("")}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {markButton(item)}
                    {item.href && item.primaryAction ? (
                      <Link href={item.href} className={btnClass("ghost", "sm")}>
                        {item.primaryAction}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </View>
  );
}
