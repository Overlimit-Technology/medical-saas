import type { AuthRepository } from "../repositories/AuthRepository";

export class LogoutUseCase {
  constructor(private readonly repo: AuthRepository) {}

  async execute(): Promise<void> {
    await this.repo.logout();
  }
}
