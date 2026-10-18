/**
 * Valida un RUN/RUT chileno con su digito verificador (modulo 11).
 * Acepta formatos con o sin puntos y guion.
 */
export function isValidRun(value: string): boolean {
  const clean = value.toUpperCase().replace(/[^0-9K]/g, "");
  if (clean.length < 7 || clean.length > 9) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return dv === expected;
}

/** Formatea un RUN como 12.345.678-5. */
export function formatRun(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9K]/g, "");
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}
