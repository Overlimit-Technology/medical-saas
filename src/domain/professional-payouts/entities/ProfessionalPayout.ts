export type ProfessionalPayoutSettings = {
  clinicPercentage: number;
  siiPercentage: number;
};

export type ProfessionalPayoutTreatmentBreakdown = {
  treatmentId: string;
  name: string;
  sessionCount: number;
  grossAmount: number;
};

export type ProfessionalPayoutRow = {
  doctorId: string;
  name: string;
  specialty: string;
  sessionCount: number;
  grossAmount: number;
  treatments: ProfessionalPayoutTreatmentBreakdown[];
};

export type ProfessionalPayoutMonthResponse = {
  settings: ProfessionalPayoutSettings;
  professionals: ProfessionalPayoutRow[];
};

export type ProfessionalPayoutEmailDispatchResult = {
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  warning: string | null;
};
