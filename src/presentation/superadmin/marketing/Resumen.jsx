"use client";

// Resumen: cuánta gente entra, de dónde viene, qué páginas ve y cuántos terminan contactando.
import { Eye, MousePointerClick, Percent, Users } from 'lucide-react';
import { useMarketing } from './Contexto';
import * as api from './api';
import { Barras, Kpi, Linea } from './graficos';
import { num, pct, tasa } from './stats';
import { Cabecera, Estado, NOMBRES_FUENTE, NOMBRES_OBJETIVO, nombrePagina, useDatos } from './comun';

export default function Resumen() {
  const { desde, hasta, dias } = useMarketing();
  const { datos: r, error, cargando } = useDatos(() => api.resumen(desde, hasta), [desde.getTime(), hasta.getTime()]);

  return (
    <>
      <Cabecera titulo="Resumen" bajada={`Lo que pasó en el sitio en los últimos ${dias} días.`} />
      <Estado cargando={cargando} error={error}>
        {r && (
          <div className="adm-grid">
            <div className="adm-kpis">
              <Kpi icono={Users} titulo="Visitantes" valor={num(r.visitantes)} detalle={`${num(r.sesiones)} sesiones`} />
              <Kpi icono={Eye} titulo="Páginas vistas" valor={num(r.visitas)} detalle={`${(r.visitas / (r.sesiones || 1)).toLocaleString('es-CL', { maximumFractionDigits: 1 })} por sesión`} />
              <Kpi icono={MousePointerClick} titulo="Conversiones" valor={num(r.conversiones)} detalle={`${num(r.convertidos)} personas`} />
              <Kpi icono={Percent} titulo="Tasa de conversión" valor={pct(tasa(r.convertidos, r.visitantes))} detalle="Visitantes que contactaron" />
            </div>
            <section className="adm-card is-wide">
              <h2>Visitantes y conversiones por día</h2>
              <Linea datos={r.por_dia} series={[{ nombre: 'Visitantes', clave: 'visitantes', color: '#50c9d5', relleno: true }, { nombre: 'Conversiones', clave: 'conversiones', color: '#e8a020' }]} />
            </section>
            <section className="adm-card">
              <h2>Páginas más vistas</h2>
              <Barras filas={r.paginas.filter((p) => p.visitas).slice(0, 8).map((p) => ({ etiqueta: nombrePagina(p.ruta), valor: p.visitas, extra: `${num(p.visitantes)} visitantes · ${num(p.conversiones)} conversiones` }))} />
            </section>
            <section className="adm-card">
              <h2>De dónde vienen</h2>
              <Barras filas={r.fuentes.slice(0, 8).map((f) => ({ etiqueta: NOMBRES_FUENTE[f.fuente] || f.fuente, valor: f.visitantes, extra: `${pct(tasa(f.convertidos, f.visitantes))} convierte` }))} />
            </section>
            <section className="adm-card">
              <h2>Campañas</h2>
              <Barras vacio="Aún no llegan visitas con utm_campaign. Arma los links en Campañas y VSL." filas={r.campanas.slice(0, 8).map((c) => ({ etiqueta: c.campana, valor: c.visitantes, extra: `${num(c.convertidos)} conversiones · ${pct(tasa(c.convertidos, c.visitantes))}` }))} />
            </section>
            <section className="adm-card">
              <h2>Qué hacen al convertir</h2>
              <Barras vacio="Todavía no hay conversiones en este período." filas={r.objetivos.map((o) => ({ etiqueta: NOMBRES_OBJETIVO[o.objetivo] || o.objetivo, valor: o.conversiones }))} />
              <h2 className="adm-sub-h">Dispositivo</h2>
              <Barras filas={r.dispositivos.sort((a, b) => b.visitantes - a.visitantes).map((d) => ({ etiqueta: d.dispositivo[0].toUpperCase() + d.dispositivo.slice(1), valor: d.visitantes, extra: pct(tasa(d.visitantes, r.visitantes), 0) }))} />
            </section>
          </div>
        )}
      </Estado>
    </>
  );
}
