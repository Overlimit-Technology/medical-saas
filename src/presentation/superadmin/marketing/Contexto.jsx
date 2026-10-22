"use client";

// Marco del panel de marketing (/super-admin/marketing/*): pestañas de secciones, período de las estadísticas
// y contexto compartido (desde/hasta) para todas las páginas.
import { createContext, useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ExternalLink, FileText, FlaskConical, Megaphone, Plug } from 'lucide-react';
import { SITIO } from './comun';
import './marketing.css';

const Ctx = createContext(null);
export const useMarketing = () => useContext(Ctx);

export const SECCIONES = [
  ['/super-admin/marketing', 'Resumen', BarChart3],
  ['/super-admin/marketing/paginas', 'Páginas', FileText],
  ['/super-admin/marketing/tests', 'Tests A/B', FlaskConical],
  ['/super-admin/marketing/campanas', 'Campañas y VSL', Megaphone],
  ['/super-admin/marketing/pixeles', 'Pixeles', Plug],
];
const RANGOS = [[7, '7 días'], [30, '30 días'], [90, '90 días']];

export default function MarcoMarketing({ children }) {
  const [dias, setDias] = useState(30);
  const ruta = usePathname();
  const ctx = useMemo(() => {
    const hasta = new Date(); hasta.setHours(23, 59, 59, 999);
    const desde = new Date(hasta.getTime() - dias * 86400000 + 1);
    return { dias, desde, hasta };
  }, [dias]);
  const activa = (href) => (href === '/super-admin/marketing' ? ruta === href : ruta === href || ruta.startsWith(`${href}/`));

  return (
    <Ctx.Provider value={ctx}>
      <div className="mk">
        <div className="mk-top">
          <nav className="mk-tabs" aria-label="Secciones de marketing">
            {SECCIONES.map(([href, nombre, Icono]) => (
              <Link key={href} href={href} className={activa(href) ? 'is-on' : ''} aria-current={activa(href) ? 'page' : undefined}><Icono size={16} aria-hidden="true" />{nombre}</Link>
            ))}
          </nav>
          <div className="mk-top-der">
            <div className="adm-rango" role="group" aria-label="Período">
              {RANGOS.map(([d, t]) => <button key={d} type="button" aria-pressed={dias === d} className={dias === d ? 'is-on' : ''} onClick={() => setDias(d)}>{t}</button>)}
            </div>
            <a className="mk-sitio" href={SITIO} target="_blank" rel="noopener noreferrer">Ver zensya.cl <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="adm-content">{children}</div>
      </div>
    </Ctx.Provider>
  );
}
