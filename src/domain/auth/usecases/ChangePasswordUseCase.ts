import type { AuthRepository } from "../repositories/AuthRepository";

export class ChangePasswordUseCase {
  constructor(private readonly repo: AuthRepository) {}

  async execute(input: { currentPassword: string; newPassword: string }): Promise<void> {
    const currentPassword = input.currentPassword?.trim();
    const newPassword = input.newPassword?.trim();

    if (!currentPassword || !newPassword) {
      throw new Error("Debes completar ambas contraseñas.");
    }

    await this.repo.changePassword({ currentPassword, newPassword });
  }
}
