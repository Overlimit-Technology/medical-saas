import type { AuthRepository } from "@/domain/auth/repositories/AuthRepository";
import type { LoginInput } from "@/domain/auth/schemas/login.schema";
import type { User } from "@/domain/auth/entities/User";
import type { AuthSession } from "@/domain/auth/entities/Session";
import { normalizePermissions } from "@/lib/permissions";

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

  async getCurrentSession(): Promise<AuthSession> {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      return {
        userId: null,
        role: null,
        isSuperAdmin: false,
        permissions: [],
        usesNewPlatform: true,
        mustChangePassword: false,
      };
    }

    return {
      userId: data.session?.userId ?? null,
      role: data.session?.role ?? null,
      isSuperAdmin: data.session?.isSuperAdmin === true,
      permissions: normalizePermissions(data.session?.permissions),
      usesNewPlatform: data.session?.usesNewPlatform !== false,
      mustChangePassword: Boolean(data.session?.mustChangePassword),
    };
  }

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error ?? "No se pudo actualizar la contrasena.";
      throw new Error(msg);
    }
  }

  async reportPresence(): Promise<void> {
    const res = await fetch("/api/auth/presence", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("No se pudo reportar presencia.");
    }
  }
}
