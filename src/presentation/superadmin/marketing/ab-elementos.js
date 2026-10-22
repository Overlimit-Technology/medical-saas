// Elementos de zensya.cl que se pueden cambiar en un test A/B. COPIA de zensya-landing/src/lib/ab-elementos.js:
// si agregas un elemento allá (data-ab="..."), agrégalo también aquí para que aparezca en el dashboard.
// Para sumar uno: agrega data-ab="mi-elemento" al elemento en el código y una entrada aquí.
// También se puede usar cualquier selector CSS escribiéndolo a mano en el dashboard (ej: ".pl-title").
export const ELEMENTOS = [
  { id: 'home-titulo', pagina: '/', nombre: 'Home · Título principal', original: 'Vive la mejor solución de salud, accesible para todos' },
  { id: 'home-subtitulo', pagina: '/', nombre: 'Home · Texto bajo el título', original: 'Agenda, fichas clínicas, pagos y recordatorios por WhatsApp en una sola plataforma, pensada para las clínicas y centros médicos de Chile.' },
  { id: 'home-boton-principal', pagina: '/', nombre: 'Home · Botón principal', original: 'Comenzar' },
  { id: 'home-boton-secundario', pagina: '/', nombre: 'Home · Botón secundario', original: 'Solicitar demo' },
  { id: 'planes-titulo', pagina: '/planes', nombre: 'Planes · Título', selector: '.pl-title', original: 'Compara los planes de Zensya' },
  { id: 'planes-bajada', pagina: '/planes', nombre: 'Planes · Texto bajo el título', selector: '.pl-sub', original: 'Elige con calma: te ayudamos a encontrar el plan, buscar lo que necesitas o ver qué cambia entre uno y otro.' },
];

export const selectorDe = (elemento) => {
  const e = ELEMENTOS.find((x) => x.id === elemento);
  if (e) return e.selector || `[data-ab="${e.id}"]`;
  return elemento; // selector CSS escrito a mano
};

// Objetivos que cuentan como conversión (los registra src/lib/medicion.js)
export const OBJETIVOS = [
  { id: 'cualquiera', nombre: 'Cualquier conversión' },
  { id: 'whatsapp', nombre: 'Abre WhatsApp' },
  { id: 'email', nombre: 'Escribe por correo' },
  { id: 'telefono', nombre: 'Llama por teléfono' },
  { id: 'ticket', nombre: 'Envía un ticket de soporte' },
  { id: 'vsl_cta', nombre: 'Botón de una landing / VSL' },
  { id: 'partnership', nombre: 'Postula a Partnership' },
];
