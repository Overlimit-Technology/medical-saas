"use client";

// Piezas comunes del panel de marketing: carga de datos, títulos de sección y nombres legibles de las páginas.
import { useCallback, useEffect, useState } from 'react';

// Dirección pública del sitio (los links de vista previa y de campañas apuntan ahí)
export const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zensya.cl').replace(/\/$/, '');

export function useDatos(fn, deps) {
  const [estado, setEstado] = useState({ datos: null, error: '', cargando: true });
  const cargar = useCallback(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    Promise.resolve().then(fn).then((datos) => vivo && setEstado({ datos, error: '', cargando: false }))
      .catch((err) => vivo && setEstado({ datos: null, error: err.message || 'No pudimos cargar los datos.', cargando: false }));
    return () => { vivo = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => cargar(), [cargar]);
  return { ...estado, recargar: cargar };
}

export function Cabecera({ titulo, bajada, children }) {
  return (
    <div className="adm-head">
      <div><h1>{titulo}</h1>{bajada && <p>{bajada}</p>}</div>
      {children && <div className="adm-head-acciones">{children}</div>}
    </div>
  );
}

export function Estado({ cargando, error, children }) {
  if (error) return <div className="adm-error-box" role="alert">{error}</div>;
  if (cargando && !children) return <div className="adm-cargando" aria-label="Cargando" />;
  return children;
}

export const NOMBRES = {
  '/': 'Inicio', '/planes': 'Planes', '/soluciones': 'Soluciones', '/integraciones': 'Integraciones',
  '/preguntas-frecuentes': 'Preguntas frecuentes', '/ayuda': 'Centro de ayuda', '/seguridad': 'Seguridad',
  '/partnership': 'Partnership', '/contact-us': 'Contacto', '/legal/privacidad': 'Privacidad', '/legal/terminos': 'Términos', '/legal/cookies': 'Cookies',
};
export const nombrePagina = (ruta) => NOMBRES[ruta] || (ruta.startsWith('/l/') ? `Landing · ${ruta.slice(3)}` : ruta.startsWith('/ayuda/guias/') ? `Guía · ${ruta.slice(13)}` : ruta);
export const PAGINAS_SITIO = Object.keys(NOMBRES);

export const NOMBRES_OBJETIVO = { whatsapp: 'WhatsApp', email: 'Correo', telefono: 'Teléfono', ticket: 'Ticket de soporte', vsl_cta: 'Botón de landing', partnership: 'Partnership', otro: 'Otro' };
export const NOMBRES_FUENTE = { directo: 'Directo (escribió la dirección)', google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', 'l.facebook.com': 'Facebook', 'lm.facebook.com': 'Facebook', 'l.instagram.com': 'Instagram' };
