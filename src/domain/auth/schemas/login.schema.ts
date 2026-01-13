import { z } from "zod";

/**
 * Schema de login.
 * - Normaliza email (trim + lowercase).
 * - Exige password no vacío.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;
