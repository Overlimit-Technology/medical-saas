import type { LoginInput } from "../schemas/login.schema";
import type { User } from "../entities/User";

/**
 * Contrato de repositorio de autenticación.
 * La implementación real puede ser HTTP, NextAuth, etc.
 */
export interface AuthRepository {
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
}
