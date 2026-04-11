import type { AuthSession } from "../entities/Session";
import type { AuthRepository } from "../repositories/AuthRepository";

export class GetCurrentSessionUseCase {
  constructor(private readonly repo: AuthRepository) {}

  async execute(): Promise<AuthSession> {
    return this.repo.getCurrentSession();
  }
}
