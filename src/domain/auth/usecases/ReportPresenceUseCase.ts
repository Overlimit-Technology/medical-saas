import type { AuthRepository } from "../repositories/AuthRepository";

export class ReportPresenceUseCase {
  constructor(private readonly repo: AuthRepository) {}

  async execute(): Promise<void> {
    await this.repo.reportPresence();
  }
}
