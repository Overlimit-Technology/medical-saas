import type { LoginInput } from "../schemas/login.schema";
import type { User } from "../entities/User";
import type { AuthSession } from "../entities/Session";

/**
 * Contrato de repositorio de autenticación.
 * La implementación real puede ser HTTP, NextAuth, etc.
 */
export interface AuthRepository {
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<AuthSession>;
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<void>;
  reportPresence(): Promise<void>;
}
