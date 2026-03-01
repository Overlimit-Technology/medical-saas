import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { LoginInput } from "@/domain/auth/schemas/login.schema";
import type { User } from "@/domain/auth/entities/User";

/**
 * Servicio de autenticación en el servidor.
 * - Busca el usuario por email.
 * - Verifica el hash de la contraseña.
 * - Realiza validaciones de negocio (status ACTIVE).
 * - Actualiza el último login.
 *
 * Este servicio no sabe nada sobre la capa HTTP, solo se enfoca en la **lógica de negocio**.
 */
export async function loginWithEmailPassword(input: LoginInput): Promise<User> {
  // Busca el usuario por email (case-insensitive)
  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      name: true,
      mustChangePassword: true,
    },
  });

  // Si el usuario no existe o no tiene contraseña, lanzamos un error genérico
  if (!user || !user.passwordHash) {
    throw new Error("Credenciales inválidas");
  }

  // Verificamos que la contraseña ingresada coincida con el hash almacenado
  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("Credenciales inválidas");
  }

  // Validación adicional: asegurarnos que el usuario esté activo
  if (user.status !== "ACTIVE") {
    // Puedes personalizar este mensaje, pero mantenlo genérico para seguridad
    throw new Error("Tu cuenta está inactiva. Contacta al administrador.");
  }

  // Actualizamos el último login del usuario
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Devolvemos solo los datos necesarios (sin passwordHash)
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}
