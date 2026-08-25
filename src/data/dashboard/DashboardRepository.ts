import type {
  AdminDashboardData,
  DoctorDashboardData,
  SecretaryDashboardData,
} from "@/domain/dashboard/entities/Dashboard";
import type { DashboardRepository } from "@/domain/dashboard/repositories/DashboardRepository";

type DashboardResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

async function loadDashboard<T>(url: string): Promise<T> {
  // no-store: tras registrar un cobro el refetch debe traer el estado real,
  // no la respuesta cacheada por Next.
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const data = (await res.json().catch(() => null)) as DashboardResponse<T> | null;

  if (!res.ok || !data?.ok || !data.data) {
    throw new Error(data?.error ?? "Error desconocido");
  }

  return data.data;
}

export class DashboardRepositoryHttp implements DashboardRepository {
  async getAdminDashboard(): Promise<AdminDashboardData> {
    return loadDashboard<AdminDashboardData>("/api/dashboard/admin");
  }

  async getDoctorDashboard(): Promise<DoctorDashboardData> {
    return loadDashboard<DoctorDashboardData>("/api/dashboard/doctor");
  }

  async getSecretaryDashboard(): Promise<SecretaryDashboardData> {
    return loadDashboard<SecretaryDashboardData>("/api/dashboard/secretary");
  }
}
