import type { AuthRepository } from "@/domain/auth/repositories/AuthRepository";
import type { LoginInput } from "@/domain/auth/schemas/login.schema";
import type { User } from "@/domain/auth/entities/User";

/**
 * Repo HTTP (se usa en el browser).
 * Importante: fetch a /api/... (route handlers en Next).
 */
export class AuthRepositoryHttp implements AuthRepository {
  async login(input: LoginInput): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // credentials para permitir cookies httpOnly
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Mensaje genérico (no revelar si el email existe)
      const msg =
        data?.message ??
        "No se pudo iniciar sesión. Revisa tus credenciales.";
      throw new Error(msg);
    }

    return data.user as User;
  }

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }
}
