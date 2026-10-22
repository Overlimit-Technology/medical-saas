// (Copia de zensya-landing) Reconoce el link de un video (YouTube, Vimeo, archivo .mp4/.webm u otro embed) y mide cuánto se ve:
// "play", "25", "50", "75" y "100" (% del video), una vez cada uno por visita.
export function tipoVideo(url = '') {
  const u = url.trim();
  if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { tipo: 'youtube', id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (m) return { tipo: 'vimeo', id: m[1], hash: m[2] };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)) return { tipo: 'archivo', url: u };
  if (u.startsWith('https://')) return { tipo: 'embed', url: u };
  return null;
}

