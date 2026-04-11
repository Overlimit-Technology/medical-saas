export type ClinicalVisit = {
  id: string;
  startedAt: string;
  patient: { id: string; firstName: string; lastName: string };
  appointment?: { id: string; startAt: string } | null;
};
