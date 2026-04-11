import type { AppointmentStatus } from "./statusColors";
import type { PaymentStatus } from "./agenda.types";

export const START_HOUR = 8;
export const END_HOUR = 20;
export const SLOT_MINUTES = 15;
export const SLOT_HEIGHT = 22;
export const NOTE_MAX_LENGTH = 250;
export const CANCEL_REASON_MAX_LENGTH = 250;

export const HIDDEN_APPOINTMENT_STATUSES: AppointmentStatus[] = [];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  WAIVED: "Exento",
};
