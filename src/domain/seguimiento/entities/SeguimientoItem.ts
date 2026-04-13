export type SeguimientoPayment = {
  id: string;
  status: string;
  amount: number;
  recordedAt: string;
};

export type SeguimientoItem = {
  id: string;
  treatmentId: string;
  treatmentName: string;
  patientId: string;
  patientName: string;
  performedAt: string;
  status: "in_progress" | "completed";
  notes: string | null;
  payments: SeguimientoPayment[];
};

export type SeguimientoStats = {
  total: number;
  inProgress: number;
  completed: number;
  pendingPayments: number;
};
