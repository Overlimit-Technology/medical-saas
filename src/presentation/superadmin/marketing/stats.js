// Cálculos para leer los resultados sin ser estadístico: tasas, mejora y probabilidad de que una variante gane.
export const tasa = (k, n) => (n ? k / n : 0);
export const pct = (x, dec = 1) => `${(x * 100).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`;
export const num = (x) => Number(x || 0).toLocaleString('es-CL');

// Función de distribución normal (aproximación de Abramowitz-Stegun)
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Probabilidad de que B convierta mejor que A (modelo Beta(1,1), aproximación normal). */
export function probMejor(a, b) {
  const pa = (a.convertidos + 1) / (a.visitantes + 2);
  const pb = (b.convertidos + 1) / (b.visitantes + 2);
  const va = (pa * (1 - pa)) / (a.visitantes + 3);
  const vb = (pb * (1 - pb)) / (b.visitantes + 3);
  return phi((pb - pa) / Math.sqrt(va + vb || 1e-9));
}

export const MIN_VISITANTES = 100;
export const MIN_CONVERSIONES = 10;

/** Lectura en palabras del estado de un test. */
export function veredicto(filas) {
  if (filas.length < 2) return { tono: 'neutro', texto: 'Aún no hay visitas en las variantes de este test.' };
  const control = filas[0];
  const totalConv = filas.reduce((s, f) => s + f.convertidos, 0);
  const pocos = filas.some((f) => f.visitantes < MIN_VISITANTES) || totalConv < MIN_CONVERSIONES;
  const otras = filas.slice(1).map((f) => ({ ...f, p: probMejor(control, f) }));
  const mejor = otras.reduce((m, f) => (f.p > m.p ? f : m), otras[0]);
  if (pocos) {
    const faltan = Math.max(0, ...filas.map((f) => MIN_VISITANTES - f.visitantes));
    return { tono: 'neutro', texto: `Faltan datos para decidir${faltan ? `: se recomiendan al menos ${MIN_VISITANTES} visitantes por variante (faltan ~${faltan})` : ` (hay ${totalConv} conversiones, se recomiendan al menos ${MIN_CONVERSIONES})`}. Por ahora ${mejor.p >= 0.5 ? `la variante ${mejor.variante} va adelante` : 'el original va adelante'}.` };
  }
  if (mejor.p >= 0.95) return { tono: 'bien', ganador: mejor.variante, texto: `La variante ${mejor.variante} gana: ${pct(mejor.p, 0)} de probabilidad de convertir mejor que el original. Puedes terminar el test y dejarla fija.` };
  if (otras.every((f) => f.p <= 0.05)) return { tono: 'mal', ganador: control.variante, texto: `El original (${control.variante}) gana con claridad. Las variantes nuevas convierten peor: conviene terminar el test.` };
  return { tono: 'neutro', texto: `Sin diferencia clara todavía. ${mejor.p >= 0.5 ? `La variante ${mejor.variante} va adelante (${pct(mejor.p, 0)} de probabilidad).` : 'El original va adelante.'} Deja correr el test unos días más.` };
}

export const diasDesde = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
