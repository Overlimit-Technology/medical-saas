import type { Clinic } from "@/domain/clinics/entities/Clinic";

export type UserRole = "DOCTOR" | "SECRETARY";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  profile?: {
    firstName: string;
    lastName: string;
    rut?: string | null;
    phone?: string | null;
  } | null;
  doctorProfile?: {
    rut: string;
    specialty?: string | null;
    bio?: string | null;
  } | null;
};

export type UserClinicsSelection = {
  clinics: Clinic[];
  activeClinicId: string | null;
};

export type CreateUserInput = {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  rut: string;
  specialty?: string;
  clinicIds?: string[];
};

export type UpdateUserDetailInput = {
  firstName: string;
  lastName: string;
  phone: string | null;
  rut: string;
  specialty: string | null;
};

export type DeleteUserResult = {
  softDeleted?: boolean;
};
