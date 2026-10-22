"use client";

// Pixeles: IDs de Meta y Google que el sitio carga (solo si el visitante acepta publicidad) y ajustes de medición.
import { useEffect, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import * as api from './api';
import { Cabecera, Estado, useDatos } from './comun';

const CAMPOS = [
  { k: 'meta_pixel_id', t: 'Pixel de Meta (Facebook e Instagram)', ph: 'Ej: 123456789012345', patron: /^\d{10,20}$/, ayuda: 'Administrador de eventos de Meta → Orígenes de datos → tu pixel → ID (solo números).' },
  { k: 'ga4_id', t: 'Google Analytics 4', ph: 'G-XXXXXXXXXX', patron: /^G-[A-Z0-9]{4,}$/, ayuda: 'Analytics → Administrar → Flujos de datos → ID de medición.' },
  { k: 'google_ads_id', t: 'Google Ads (etiqueta de conversión)', ph: 'AW-123456789', patron: /^AW-\d{6,}$/, ayuda: 'Google Ads → Objetivos → Conversiones → tu conversión → Configurar la etiqueta.' },
  { k: 'google_ads_label', t: 'Google Ads · etiqueta de la conversión «Lead»', ph: 'AbCdEfGhIjK', patron: /^[\w-]{6,}$/, ayuda: 'Es el texto después de la barra en send_to: AW-123456789/AbCdEfGhIjK.' },
];

const EVENTOS = [
  ['Cada página que se ve', 'PageView', 'page_view'],
  ['Visita a una landing / VSL', 'ViewContent', '—'],
  ['Ve el 50% y el 100% del video', 'VideoVisto50 / VideoVisto100', 'video_progress'],
  ['Abre WhatsApp, escribe, llama, envía un ticket o aprieta el botón de una landing', 'Lead', 'generate_lead + conversión de Ads'],
];

export default function Pixeles() {
  const { datos, error, cargando } = useDatos(() => api.leerConfig(), []);
  const [c, setC] = useState(null);
  const [estado, setEstado] = useState({ guardando: false, error: '', ok: false });
  useEffect(() => { if (datos) setC(datos); }, [datos]);

  const guardar = async (e) => {
    e.preventDefault();
    const mal = CAMPOS.find((f) => (c[f.k] || '').trim() && !f.patron.test(c[f.k].trim()));
    if (mal) { setEstado({ guardando: false, error: `Revisa el formato de «${mal.t}». Ejemplo: ${mal.ph}`, ok: false }); return; }
    setEstado({ guardando: true, error: '', ok: false });
    try {
      const g = await api.guardarConfig(Object.fromEntries([...CAMPOS.map((f) => [f.k, (c[f.k] || '').trim()]), ['medicion_requiere_consentimiento', c.medicion_requiere_consentimiento]]));
      setC(g);
      setEstado({ guardando: false, error: '', ok: true });
    } catch (err) { setEstado({ guardando: false, error: err.message, ok: false }); }
  };

  return (
    <>
      <Cabecera titulo="Pixeles e integraciones" bajada="Conecta Meta y Google para medir tus campañas. Se activan en todo el sitio y en las landings, solo para quienes aceptan cookies de publicidad." />
      <Estado cargando={cargando} error={error}>
        {c && (
          <div className="adm-grid">
            <form className="adm-card is-wide" onSubmit={guardar}>
              <div className="adm-form">
                {CAMPOS.map((f) => {
                  const v = (c[f.k] || '').trim();
                  return (
                    <label key={f.k} className="adm-field">
                      <span>{f.t}</span>
                      <input value={c[f.k] || ''} onChange={(e) => setC({ ...c, [f.k]: e.target.value })} placeholder={f.ph} spellCheck="false" autoComplete="off" />
                      <small className={v ? (f.patron.test(v) ? 'adm-sube' : 'adm-baja') : 'adm-nota'}>
                        {v ? (f.patron.test(v) ? <><Check size={13} /> Formato correcto</> : <><CircleAlert size={13} /> Formato no válido</>) : f.ayuda}
                      </small>
                    </label>
                  );
                })}
                <label className="adm-check is-wide">
                  <input type="checkbox" checked={c.medicion_requiere_consentimiento} onChange={(e) => setC({ ...c, medicion_requiere_consentimiento: e.target.checked })} />
                  <span><b>Pedir permiso antes de medir visitas</b> Recomendado por la Ley 21.719. Si lo desactivas, la medición propia (no los pixeles) funciona sin preguntar; revísalo con tu asesor legal.</span>
                </label>
              </div>
              {estado.error && <p className="adm-error" role="alert">{estado.error}</p>}
              {estado.ok && <p className="adm-ok" role="status">Guardado. Los visitantes nuevos ya cargan esta configuración.</p>}
              <div className="adm-acciones-btns"><button type="submit" className="adm-btn" disabled={estado.guardando}>{estado.guardando ? 'Guardando…' : 'Guardar'}</button></div>
            </form>
            <section className="adm-card is-wide">
              <h2>Qué se envía automáticamente</h2>
              <div className="adm-tabla-wrap">
                <table className="adm-tabla is-compacta">
                  <thead><tr><th scope="col">Cuando la persona…</th><th scope="col">Meta</th><th scope="col">Google</th></tr></thead>
                  <tbody>{EVENTOS.map(([q, m, g]) => <tr key={q}><th scope="row">{q}</th><td><code>{m}</code></td><td><code>{g}</code></td></tr>)}</tbody>
                </table>
              </div>
              <p className="adm-nota">Para comprobar que funciona: instala <b>Meta Pixel Helper</b> y <b>Google Tag Assistant</b> en Chrome, abre el sitio, acepta las cookies y navega. Los eventos aparecen en cada herramienta en unos minutos.</p>
            </section>
          </div>
        )}
      </Estado>
    </>
  );
}
