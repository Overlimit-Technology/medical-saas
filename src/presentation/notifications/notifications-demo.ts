export type DemoNotificationTone = "info" | "success" | "warning";

export type DemoNotification = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  tone: DemoNotificationTone;
  category: string;
  unread?: boolean;
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "notif-1",
    title: "Cita reagendada",
    description: "Camila Soto movió su control de ortodoncia para hoy a las 16:30.",
    timeLabel: "Hace 8 min",
    tone: "info",
    category: "Agenda",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Pago confirmado",
    description: "Se registró un abono de $48.000 para el tratamiento de Felipe Araya.",
    timeLabel: "Hace 22 min",
    tone: "success",
    category: "Cobros",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Ficha pendiente",
    description: "Hay una evolución clínica pendiente de completar antes del cierre del día.",
    timeLabel: "Hace 1 h",
    tone: "warning",
    category: "Clínica",
  },
  {
    id: "notif-4",
    title: "Nuevo mensaje interno",
    description: "Secretaría dejó un comentario sobre el paciente de la box 3.",
    timeLabel: "Hace 2 h",
    tone: "info",
    category: "Chat",
  },
  {
    id: "notif-5",
    title: "Recordatorio de box",
    description: "La box 2 quedó bloqueada para mantención preventiva mañana a primera hora.",
    timeLabel: "Ayer",
    tone: "warning",
    category: "Boxes",
  },
];
