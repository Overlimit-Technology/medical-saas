"use client";

// Campañas y VSL: landings de campaña (zensya.cl/l/<slug>) con video, links con UTM para cada anuncio y embudo de resultados.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import * as api from './api';
import { useMarketing } from './Contexto';
import { Embudo } from './graficos';
import { num, pct, tasa } from './stats';
import { Cabecera, Estado, nombrePagina, PAGINAS_SITIO, SITIO, useDatos } from './comun';
import { tipoVideo } from './video';

const sitio = () => SITIO;
const slugDe = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const nueva = () => ({ slug: '', titulo: '', bajada: '', video_url: '', puntos: [], cta_texto: 'Quiero probar Zensya gratis', cta_accion: 'whatsapp', cta_link: '', cta_mensaje: '', nota: '7 días de prueba gratuita · Sin tarjeta de crédito', publicada: false });

const FUENTES = [
  ['facebook', 'Facebook', 'paid_social'], ['instagram', 'Instagram', 'paid_social'], ['google', 'Google Ads', 'cpc'],
  ['tiktok', 'TikTok', 'paid_social'], ['linkedin', 'LinkedIn', 'paid_social'], ['youtube', 'YouTube', 'video'],
  ['email', 'Correo / newsletter', 'email'], ['whatsapp', 'WhatsApp', 'mensajeria'],
];
const NOMBRE_VIDEO = { youtube: 'YouTube', vimeo: 'Vimeo', archivo: 'Archivo de video', embed: 'Video insertado' };

function useCopiar() {
  const [copiado, setCopiado] = useState('');
  const copiar = (texto, id = texto) => navigator.clipboard?.writeText(texto).then(() => { setCopiado(id); setTimeout(() => setCopiado(''), 1500); });
  return [copiado, copiar];
}

export function ArmadorLinks({ rutaInicial = '/' }) {
  const [ruta, setRuta] = useState(rutaInicial);
  const [fuente, setFuente] = useState('facebook');
  const [campana, setCampana] = useState('');
  const [contenido, setContenido] = useState('');
  const [copiado, copiar] = useCopiar();
  useEffect(() => setRuta(rutaInicial), [rutaInicial]);
  const medio = FUENTES.find((f) => f[0] === fuente)?.[2] || 'referral';
  const q = new URLSearchParams({ utm_source: fuente, utm_medium: medio, ...(campana ? { utm_campaign: slugDe(campana) } : {}), ...(contenido ? { utm_content: slugDe(contenido) } : {}) });
  const url = `${sitio()}${ruta}?${q}`;
  return (
    <div className="adm-utm">
      <div className="adm-form">
        <label className="adm-field"><span>Página</span><input value={ruta} onChange={(e) => setRuta(e.target.value)} list="adm-rutas" /></label>
        <datalist id="adm-rutas">{PAGINAS_SITIO.map((p) => <option key={p} value={p}>{nombrePagina(p)}</option>)}</datalist>
        <label className="adm-field"><span>Dónde va el anuncio</span><select value={fuente} onChange={(e) => setFuente(e.target.value)}>{FUENTES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
        <label className="adm-field"><span>Nombre de la campaña</span><input value={campana} onChange={(e) => setCampana(e.target.value)} placeholder="Ej: Lanzamiento octubre" /></label>
        <label className="adm-field"><span>Anuncio o versión (opcional)</span><input value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Ej: video corto" /></label>
      </div>
      <div className="adm-utm-out">
        <code>{url}</code>
        <button type="button" className="adm-btn is-sm" onClick={() => copiar(url, 'utm')}>{copiado === 'utm' ? <><Check size={15} />Copiado</> : <><Copy size={15} />Copiar link</>}</button>
      </div>
      <p className="adm-nota">Pega este link en el anuncio. Así el dashboard sabe de qué campaña viene cada visita y cada contacto.</p>
    </div>
  );
}

function Resultados({ l }) {
  const { desde, hasta, dias } = useMarketing();
  const { datos: r, error, cargando } = useDatos(() => api.statsLanding(l.id, desde, hasta), [l.slug, desde.getTime()]);
  return (
    <Estado cargando={cargando} error={error}>
      {r && (
        <div className="adm-landing-res">
          <Embudo pasos={[
            { etiqueta: 'Entraron', valor: r.visitantes }, { etiqueta: 'Le dieron play', valor: r.reproducciones },
            { etiqueta: 'Vieron la mitad', valor: r.video_50 }, { etiqueta: 'Vieron todo', valor: r.video_100 }, { etiqueta: 'Hicieron clic en el botón', valor: r.convertidos },
          ]} />
          <p className="adm-nota">Últimos {dias} días · Conversión {pct(tasa(r.convertidos, r.visitantes))} · Fuentes: {r.fuentes.map((f) => `${f.fuente} (${num(f.visitantes)})`).join(', ') || '—'}</p>
        </div>
      )}
    </Estado>
  );
}

function Editor({ inicial, alGuardar, alBorrar }) {
  const [l, setL] = useState({ ...inicial, puntosTexto: (inicial.puntos || []).join('\n') });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [copiado, copiar] = useCopiar();
  const set = (k, v) => setL((x) => ({ ...x, [k]: v }));
  const video = tipoVideo(l.video_url);
  const url = `${sitio()}/l/${l.slug || 'mi-campana'}`;

  const guardar = async (cambios = {}) => {
    const { puntosTexto, ...resto } = { ...l, ...cambios };
    const fila = { ...resto, slug: slugDe(resto.slug || resto.titulo), puntos: puntosTexto.split('\n').map((p) => p.trim()).filter(Boolean) };
    if (!fila.titulo.trim()) { setError('Escribe el título de la landing.'); return; }
    if (!fila.slug) { setError('Escribe la dirección de la landing.'); return; }
    if (fila.cta_accion === 'link' && !fila.cta_link.trim()) { setError('Escribe a dónde lleva el botón.'); return; }
    setGuardando(true); setError('');
    try { const g = await api.guardar('landings', fila); setL({ ...g, puntosTexto: (g.puntos || []).join('\n') }); alGuardar(g); } catch (err) { setError(err.message); } finally { setGuardando(false); }
  };

  return (
    <div className="adm-grid">
      <section className="adm-card is-wide">
        <div className="adm-form">
          <label className="adm-field is-wide"><span>Título (lo primero que se lee)</span><input value={l.titulo} onChange={(e) => { set('titulo', e.target.value); if (!inicial.id) set('slug', slugDe(e.target.value)); }} placeholder="Ej: Tu clínica dental, sin papeleo ni citas perdidas" /></label>
          <label className="adm-field is-wide"><span>Bajada</span><textarea rows={2} value={l.bajada} onChange={(e) => set('bajada', e.target.value)} placeholder="Una o dos frases: a quién le sirve y qué gana." /></label>
          <label className="adm-field"><span>Dirección</span><div className="adm-prefijo"><span>/l/</span><input value={l.slug} onChange={(e) => set('slug', slugDe(e.target.value))} placeholder="clinicas-dentales" /></div></label>
          <label className="adm-field"><span>Link del video (VSL)</span><input value={l.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="YouTube, Vimeo o un .mp4" />
            <small className={video ? 'adm-sube' : 'adm-nota'}>{video ? `✓ ${NOMBRE_VIDEO[video.tipo]}${video.tipo === 'embed' ? ' (sin medición de avance)' : ' · se mide cuánto lo ven'}` : 'Sin video, la landing muestra un espacio reservado.'}</small></label>
          <label className="adm-field is-wide"><span>Puntos clave (uno por línea)</span><textarea rows={4} value={l.puntosTexto} onChange={(e) => set('puntosTexto', e.target.value)} placeholder={'Recordatorios automáticos por WhatsApp\nFicha clínica en la nube\nCobros y boletas en un solo lugar'} /></label>
          <label className="adm-field"><span>Texto del botón</span><input value={l.cta_texto} onChange={(e) => set('cta_texto', e.target.value)} /></label>
          <label className="adm-field"><span>El botón…</span><select value={l.cta_accion} onChange={(e) => set('cta_accion', e.target.value)}><option value="whatsapp">Abre WhatsApp de ventas</option><option value="link">Lleva a un link</option></select></label>
          {l.cta_accion === 'whatsapp'
            ? <label className="adm-field is-wide"><span>Mensaje que llega por WhatsApp</span><input value={l.cta_mensaje} onChange={(e) => set('cta_mensaje', e.target.value)} placeholder={`Hola, vi «${l.titulo || 'el video'}» y quiero probar Zensya.`} /></label>
            : <label className="adm-field is-wide"><span>Link del botón</span><input value={l.cta_link} onChange={(e) => set('cta_link', e.target.value)} placeholder="https://app.zensya.cl/registro o /contact-us" /></label>}
          <label className="adm-field is-wide"><span>Nota bajo el botón</span><input value={l.nota} onChange={(e) => set('nota', e.target.value)} /></label>
          <label className="adm-check is-wide"><input type="checkbox" checked={l.publicada} onChange={(e) => set('publicada', e.target.checked)} /><span><b>Publicada</b> Si no está publicada, la dirección muestra «Esta página ya no está disponible».</span></label>
        </div>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-acciones-btns">
          {l.id && <button type="button" className="adm-btn is-ghost is-danger" onClick={() => alBorrar(l)}><Trash2 size={16} />Borrar</button>}
          {l.id && l.publicada && <a className="adm-btn is-ghost" href={`${SITIO}/l/${l.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Ver landing</a>}
          <button type="button" className="adm-btn is-ghost" onClick={() => copiar(url, 'url')}>{copiado === 'url' ? <><Check size={16} />Copiado</> : <><Copy size={16} />Copiar dirección</>}</button>
          <button type="button" className="adm-btn" onClick={() => guardar()} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </section>

      <section className="adm-card">
        <h2>Vista previa</h2>
        <div className="adm-lnd-prev">
          <b>{l.titulo || 'Título de la landing'}</b>
          {l.bajada && <p>{l.bajada}</p>}
          <div className="adm-lnd-prev-v">{video ? `▶ ${NOMBRE_VIDEO[video.tipo]}` : '▶ Video'}</div>
          <span className="adm-lnd-prev-b">{l.cta_texto || 'Botón'}</span>
          {l.nota && <small>{l.nota}</small>}
          {l.puntosTexto.trim() && <ul>{l.puntosTexto.split('\n').filter((p) => p.trim()).map((p) => <li key={p}>✓ {p}</li>)}</ul>}
        </div>
      </section>

      <section className="adm-card">
        <h2>Resultados</h2>
        {l.id ? <Resultados l={l} /> : <p className="adm-nota">Guarda la landing para ver sus resultados.</p>}
      </section>

      {l.id && (
        <section className="adm-card is-wide">
          <h2>Links para tus anuncios</h2>
          <ArmadorLinks rutaInicial={`/l/${l.slug}`} />
        </section>
      )}
    </div>
  );
}

function Detalle({ id, lista, recargar, cargando }) {
  const ir = useRouter();
  const l = id === 'nueva' ? nueva() : lista.find((x) => x.id === id);
  if (!l && cargando) return <div className="adm-cargando" aria-label="Cargando" />;
  if (!l) return <div className="adm-vacio">No encontramos esa landing. <Link href="/super-admin/marketing/campanas">Volver</Link></div>;
  const borrar = async (x) => {
    if (!window.confirm(`¿Borrar la landing «${x.titulo}»? La dirección /l/${x.slug} dejará de funcionar.`)) return;
    await api.borrar('landings', x.id);
    recargar();
    ir.push('/super-admin/marketing/campanas');
  };
  return (
    <>
      <Cabecera titulo={id === 'nueva' ? 'Nueva landing' : l.titulo} bajada={id === 'nueva' ? 'Una página sin distracciones para tus anuncios: título, video, puntos clave y un solo botón.' : `zensya.cl/l/${l.slug} · ${l.publicada ? 'Publicada' : 'Sin publicar'}`}>
        <Link className="adm-btn is-ghost" href="/super-admin/marketing/campanas"><ArrowLeft size={16} />Todas las campañas</Link>
      </Cabecera>
      <Editor key={l.id || 'nueva'} inicial={l} alBorrar={borrar} alGuardar={(g) => { recargar(); if (id === 'nueva') ir.replace(`/super-admin/marketing/campanas/${g.id}`); }} />
    </>
  );
}

function FilaLanding({ l }) {
  const { desde, hasta } = useMarketing();
  const { datos: r } = useDatos(() => api.statsLanding(l.id, desde, hasta), [l.slug, desde.getTime()]);
  return (
    <Link href={`/super-admin/marketing/campanas/${l.id}`} className="adm-card adm-test">
      <div className="adm-test-h"><span className={`adm-estado is-${l.publicada ? 'activo' : 'borrador'}`}>{l.publicada ? 'Publicada' : 'Sin publicar'}</span><small>/l/{l.slug}</small></div>
      <h3>{l.titulo}</h3>
      <div className="adm-test-vars">
        <span><b>{num(r?.visitantes)}</b> visitantes</span>
        <span><b>{num(r?.reproducciones)}</b> plays</span>
        <span><b>{pct(tasa(r?.convertidos || 0, r?.visitantes || 0))}</b> conversión</span>
      </div>
    </Link>
  );
}

// Lista de landings (/super-admin/marketing/campanas)
export function ListaCampanas() {
  const { datos: lista, error, cargando } = useDatos(() => api.listar('landings'), []);
  return (
    <Estado cargando={cargando} error={error}>
      {lista && (
        <>
          <Cabecera titulo="Campañas y VSL" bajada="Crea landings para tus anuncios, con video de ventas, y arma los links con seguimiento para cada campaña.">
            <Link className="adm-btn" href="/super-admin/marketing/campanas/nueva"><Plus size={16} />Nueva landing</Link>
          </Cabecera>
          {lista.length === 0 ? (
            <section className="adm-card adm-empty"><h2>Todavía no hay landings</h2><p>Una landing de VSL tiene un título potente, un video corto y un botón que abre WhatsApp. Ideal para anuncios en Meta y Google.</p><Link className="adm-btn" href="/super-admin/marketing/campanas/nueva"><Plus size={16} />Crear la primera</Link></section>
          ) : <div className="adm-tests">{lista.map((l) => <FilaLanding key={l.id} l={l} />)}</div>}
          <section className="adm-card is-wide adm-mt">
            <h2>Armar un link con seguimiento (UTM)</h2>
            <ArmadorLinks />
          </section>
        </>
      )}
    </Estado>
  );
}

// Detalle o creación de una landing (/super-admin/marketing/campanas/[id])
export function DetalleCampana({ id }) {
  const { datos: lista, error, cargando, recargar } = useDatos(() => (id === 'nueva' ? [] : api.listar('landings')), [id]);
  return <Estado cargando={cargando} error={error}>{lista && <Detalle id={id} lista={lista} recargar={recargar} cargando={cargando} />}</Estado>;
}
