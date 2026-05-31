import type { UserPermission } from "@/lib/permissions";
import type { PlatformRole } from "./platformConstants";

export type SuperAdminUserRow = {
  id: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "SECRETARY";
  platformRole: PlatformRole;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  isSuperAdmin: boolean;
  usesNewPlatform: boolean;
  permissions: UserPermission[];
  firstName: string;
  lastName: string;
  specialty: string;
  clinicIds: string[];
  clinicNames: string[];
  createdAt: string;
  lastLoginAt: string | null;
};

export type SuperAdminClinicRow = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plan: "Trial" | "Starter" | "Pro" | "Inactiva";
  activeModules: UserPermission[];
  users: SuperAdminUserRow[];
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  doctors: number;
  admins: number;
  secretaries: number;
  resources: {
    patients: number;
    appointments: number;
    clinicalVisits: number;
    observations: number;
    formTemplates: number;
    clinicalRecords: number;
    alerts: number;
    leads: number;
    cashMovements: number;
    boxes: number;
    memberships: number;
    totalRecords: number;
    usagePercent: number;
  };
};

export type SuperAdminRoleRow = {
  role: PlatformRole;
  label: string;
  description: string;
  users: number;
  activeUsers: number;
  suspendedUsers: number;
  permissions: Array<{
    key: UserPermission;
    enabledUsers: number;
    totalUsers: number;
    enabledPercent: number;
  }>;
};

export type SuperAdminModuleRow = {
  key: UserPermission;
  label: string;
  description: string;
  category: "core" | "growth" | "ops";
  clinicsEnabled: number;
  usersEnabled: number;
  roleAccess: Array<{
    role: PlatformRole;
    enabledUsers: number;
    totalUsers: number;
    enabledPercent: number;
  }>;
};

export type SuperAdminTrialRow = {
  clinicId: string;
  clinicName: string;
  contactName: string;
  contactEmail: string;
  startAt: string;
  endAt: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  status: "active" | "converted" | "expired";
  totalUsers: number;
};

export type SuperAdminActivityRow = {
  id: string;
  text: string;
  timeLabel: string;
  tone: "teal" | "success" | "warning" | "danger";
};

export type SuperAdminPlatformData = {
  generatedAt: string;
  stats: {
    totalClinics: number;
    activeClinics: number;
    totalUsers: number;
    activeUsers: number;
    newClinicsMonth: number;
    newClinicsDelta: string;
    newUsersMonth: number;
    newUsersDelta: string;
    activeTrials: number;
    trialsExpiringSoon: number;
    totalRecords: number;
    averageUsagePercent: number;
  };
  clinics: SuperAdminClinicRow[];
  users: SuperAdminUserRow[];
  roles: SuperAdminRoleRow[];
  modules: SuperAdminModuleRow[];
  trials: SuperAdminTrialRow[];
  activity: SuperAdminActivityRow[];
};
