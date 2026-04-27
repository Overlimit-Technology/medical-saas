import type {
  InternalAlert,
  InternalAlertActor,
  InternalAlertDoctor,
} from "@/domain/internal-alerts/entities/InternalAlert";
import type {
  NotificationPanelItem,
  NotificationPanelTone,
  NotificationSidebarSections,
} from "./internal-alerts.types";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildPersonLabel(person: InternalAlertActor | InternalAlertDoctor | null) {
  if (!person) return null;
  const fullName = [person.firstName ?? "", person.lastName ?? ""].join(" ").trim();
  return fullName || person.email;
}

function formatRelativeTime(dateValue: string) {
  const target = new Date(dateValue);
  const elapsedMs = target.getTime() - Date.now();
  const elapsedSeconds = Math.round(elapsedMs / 1000);
  const absSeconds = Math.abs(elapsedSeconds);

  if (absSeconds < 60) {
    return capitalize(relativeTimeFormatter.format(elapsedSeconds, "second"));
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60) {
    return capitalize(relativeTimeFormatter.format(elapsedMinutes, "minute"));
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) {
    return capitalize(relativeTimeFormatter.format(elapsedHours, "hour"));
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  if (Math.abs(elapsedDays) < 7) {
    return capitalize(relativeTimeFormatter.format(elapsedDays, "day"));
  }

  const elapsedWeeks = Math.round(elapsedDays / 7);
  if (Math.abs(elapsedWeeks) < 5) {
    return capitalize(relativeTimeFormatter.format(elapsedWeeks, "week"));
  }

  const elapsedMonths = Math.round(elapsedDays / 30);
  if (Math.abs(elapsedMonths) < 12) {
    return capitalize(relativeTimeFormatter.format(elapsedMonths, "month"));
  }

  const elapsedYears = Math.round(elapsedDays / 365);
  return capitalize(relativeTimeFormatter.format(elapsedYears, "year"));
}

function resolveTone(eventType: InternalAlert["eventType"]): NotificationPanelTone {
  switch (eventType) {
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_RESCHEDULED":
      return "info";
    case "APPOINTMENT_CANCELLED":
    case "APPOINTMENT_CONFLICT":
    case "PAYMENT_PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

function resolveCategoryLabel(eventType: InternalAlert["eventType"]) {
  switch (eventType) {
    case "PAYMENT_PENDING":
      return "Cobros";
    case "CUSTOM":
      return "Clínica";
    default:
      return "Agenda";
  }
}

function resolvePrimaryAction(alert: InternalAlert) {
  if (alert.referenceType === "APPOINTMENT" && alert.referenceId) {
    return {
      label: "Ver cita",
      href: `/appointments/${alert.referenceId}`,
    };
  }

  if (alert.referenceType === "PAYMENT_HISTORY") {
    return {
      label: "Ver CRM",
      href: "/crm",
    };
  }

  return {
    label: null,
    href: undefined,
  };
}

export function sortInternalAlerts(alerts: InternalAlert[]) {
  return [...alerts].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function mapInternalAlertToPanel(alert: InternalAlert): NotificationPanelItem {
  const clinicLabel = [alert.clinic.name, alert.clinic.city].filter(Boolean).join(" · ");
  const actorLabel = buildPersonLabel(alert.createdBy);
  const doctorLabel = buildPersonLabel(alert.doctor);
  const primaryAction = resolvePrimaryAction(alert);

  return {
    id: alert.id,
    title: alert.title,
    description: alert.message,
    timeLabel: formatRelativeTime(alert.createdAt),
    tone: resolveTone(alert.eventType),
    categoryLabel: resolveCategoryLabel(alert.eventType),
    isRead: alert.isRead,
    primaryAction: primaryAction.label,
    href: primaryAction.href,
    metadata: [
      clinicLabel ? `Sede: ${clinicLabel}` : "",
      actorLabel ? `Actor: ${actorLabel}` : "",
      doctorLabel ? `Doctor: ${doctorLabel}` : "",
    ].filter(Boolean),
    source: alert,
  };
}

export function buildNotificationSidebarSections(
  alerts: InternalAlert[],
  limit = 20
): NotificationSidebarSections {
  const sortedAlerts = sortInternalAlerts(alerts);
  const unreadAlerts = sortedAlerts.filter((alert) => !alert.isRead).slice(0, limit);
  const recentAlerts = sortedAlerts
    .filter((alert) => alert.isRead)
    .slice(0, Math.max(0, limit - unreadAlerts.length));

  return {
    unread: unreadAlerts.map(mapInternalAlertToPanel),
    recent: recentAlerts.map(mapInternalAlertToPanel),
  };
}
