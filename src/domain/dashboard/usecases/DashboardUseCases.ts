import type {
  AdminDashboardData,
  DoctorDashboardData,
  SecretaryDashboardData,
} from "../entities/Dashboard";
import type { DashboardRepository } from "../repositories/DashboardRepository";

export class GetAdminDashboardUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(): Promise<AdminDashboardData> {
    return this.repo.getAdminDashboard();
  }
}

export class GetDoctorDashboardUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(): Promise<DoctorDashboardData> {
    return this.repo.getDoctorDashboard();
  }
}

export class GetSecretaryDashboardUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(): Promise<SecretaryDashboardData> {
    return this.repo.getSecretaryDashboard();
  }
}
