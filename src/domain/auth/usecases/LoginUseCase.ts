import type { AuthRepository } from "../repositories/AuthRepository";
import { loginSchema, type LoginInput } from "../schemas/login.schema";
import type { User } from "../entities/User";

export class LoginUseCase {
  constructor(private readonly repo: AuthRepository) {}

  /**
   * Ejecuta el login:
   * - Valida (Zod) como “regla de contrato”
   * - Luego llama al repo
   */
  async execute(input: LoginInput): Promise<User> {
    const parsed = loginSchema.parse(input);
    return this.repo.login(parsed);
  }
}
