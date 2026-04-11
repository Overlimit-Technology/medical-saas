import type {
  AdminDashboardData,
  DoctorDashboardData,
  SecretaryDashboardData,
} from "../entities/Dashboard";

export interface DashboardRepository {
  getAdminDashboard(): Promise<AdminDashboardData>;
  getDoctorDashboard(): Promise<DoctorDashboardData>;
  getSecretaryDashboard(): Promise<SecretaryDashboardData>;
}
