export type InternalAlertEventType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_CONFLICT"
  | "PATIENT_ARRIVED"
  | "PAYMENT_PENDING"
  | "CUSTOM";

export type InternalAlertDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type InternalAlertClinic = {
  id: string;
  name: string;
  city: string | null;
};

export type InternalAlertActor = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
};

export type InternalAlertDoctor = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type InternalAlert = {
  id: string;
  recipientId: string;
  eventType: InternalAlertEventType;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  clinic: InternalAlertClinic;
  createdAt: string;
  createdBy: InternalAlertActor;
  doctor: InternalAlertDoctor | null;
  deliveryStatus: InternalAlertDeliveryStatus;
  deliveryError: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  isRead: boolean;
};

export type InternalAlertsListResult = {
  items: InternalAlert[];
  unreadCount: number;
};
