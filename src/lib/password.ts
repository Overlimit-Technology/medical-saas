import bcrypt from "bcryptjs";

/**
 * Cost factor: 10 suele ser balance correcto para MVP.
 * En producción puedes ajustar según performance/seguridad.
 */
const SALT_ROUNDS = 10;

/** Hashea un password en texto plano. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verifica password en texto plano contra un hash guardado. */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
