// Llamadas del panel de marketing a la API del super-admin (/api/super-admin/marketing/*), con la sesión actual.
const BASE = '/api/super-admin/marketing';
const RUTA = { experimentos: 'experimentos', landings: 'landings' };

async function pedir(url, opciones = {}) {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...opciones });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || 'No se pudo completar la operación.');
  return j.data;
}
const rango = (desde, hasta) => `?desde=${encodeURIComponent(desde.toISOString())}&hasta=${encodeURIComponent(hasta.toISOString())}`;

export const resumen = (desde, hasta) => pedir(`${BASE}/resumen${rango(desde, hasta)}`);
export const statsExperimento = (id) => pedir(`${BASE}/experimentos/${id}`);
export const statsLanding = (id, desde, hasta) => pedir(`${BASE}/landings/${id}${rango(desde, hasta)}`);
export const listar = (tabla) => pedir(`${BASE}/${RUTA[tabla]}`);
export const guardar = (tabla, fila) => pedir(`${BASE}/${RUTA[tabla]}`, { method: 'POST', body: JSON.stringify(fila) });
export const borrar = (tabla, id) => pedir(`${BASE}/${RUTA[tabla]}/${id}`, { method: 'DELETE' });
export const leerConfig = () => pedir(`${BASE}/config`);
export const guardarConfig = (c) => pedir(`${BASE}/config`, { method: 'PUT', body: JSON.stringify(c) });
