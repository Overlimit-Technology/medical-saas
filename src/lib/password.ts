import bcrypt from "bcryptjs";
import crypto from "crypto";

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

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*_-+=?";
const DEFAULT_PASSWORD_LENGTH = 8;

function randomChar(charset: string): string {
  return charset[crypto.randomInt(0, charset.length)];
}

/** Genera un password aleatorio con mayÃºscula, nÃºmero y sÃ­mbolo. */
export function generatePassword(length = DEFAULT_PASSWORD_LENGTH): string {
  if (length < 8) {
    throw new Error("Password length must be at least 8 characters.");
  }

  const chars = [
    randomChar(UPPERCASE),
    randomChar(NUMBERS),
    randomChar(SYMBOLS),
    randomChar(LOWERCASE),
  ];
  const pool = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;

  while (chars.length < length) {
    chars.push(randomChar(pool));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const swapIndex = crypto.randomInt(0, i + 1);
    [chars[i], chars[swapIndex]] = [chars[swapIndex], chars[i]];
  }

  return chars.join("");
}
