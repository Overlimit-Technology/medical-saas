const SESSION_ERROR_MESSAGES = [
  "No autorizado.",
  "Clinica no seleccionada.",
  "Debes cambiar tu contrasena.",
  "Acceso denegado.",
] as const;

export function isSessionErrorMessage(message: string) {
  return SESSION_ERROR_MESSAGES.includes(message as (typeof SESSION_ERROR_MESSAGES)[number]);
}

