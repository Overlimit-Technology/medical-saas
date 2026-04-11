export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

export type PatientAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  doctor: {
    profile?: { firstName: string; lastName: string } | null;
  };
};

export type PatientDetail = Patient & {
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  appointments?: PatientAppointment[];
};

export type SavePatientInput = {
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  run: string;
  email: string | null;
  phone: string | null;
};

export type UpdatePatientDetailInput = SavePatientInput & {
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  city: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export type PatientsResult = {
  items: Patient[];
  total: number;
};

export type SavePatientResult = {
  notificationWarning?: string | null;
};

export type DeletePatientResult = {
  softDeleted?: boolean;
  deletedAppointments?: number;
};
