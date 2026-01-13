/**
 * UserRole y UserStatus deben reflejar lo que tengas en Prisma
 * (mantenlos sincronizados).
 */
export type UserRole = "ADMIN" | "DOCTOR" | "SECRETARY";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

/**
 * Usuario público (lo que puede viajar al frontend).
 * NOTA: Nunca incluyas passwordHash aquí.
 */
export type User = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name?: string | null;
};
