export type PaymentHistoryItem = {
  id: string;
  recordedAt: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: number;
  treatment: {
    id: string;
    name: string;
    price: number;
  };
};

export type DailyCashItem = {
  id: string;
  recordedAt: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: number;
  notes?: string | null;
  patientName: string;
  treatmentName: string;
  movementType: "PAYMENT" | "INCOME" | "EXPENSE";
  userName?: string | null;
};

export type DailyCashSummary = {
  totalAmount: number;
  totalIncome: number;
  totalExpense: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  waivedCount: number;
};
