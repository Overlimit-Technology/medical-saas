export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  boxId: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes?: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};
