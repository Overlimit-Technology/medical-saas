export type RedactionResult = {
  text: string;
  redactions: number;
};

// El orden importa: primero patrones especificos (RUT, correo) y despues numeros largos.
const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/g, label: "[RUT]" },
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, label: "[CORREO]" },
  { re: /(?:\+?56\s?)?9[\s-]?\d{4}[\s-]?\d{4}\b/g, label: "[TELEFONO]" },
  { re: /\b\d{7,}\b/g, label: "[NUMERO]" },
];

/**
 * Quita identificadores evidentes antes de enviar texto a un proveedor externo.
 * No reemplaza una revision de privacidad: nombres propios y otros datos libres pueden quedar.
 */
export function redactSensitive(input: string): RedactionResult {
  let text = input;
  let redactions = 0;

  for (const { re, label } of PATTERNS) {
    text = text.replace(re, () => {
      redactions += 1;
      return label;
    });
  }

  return { text, redactions };
}
