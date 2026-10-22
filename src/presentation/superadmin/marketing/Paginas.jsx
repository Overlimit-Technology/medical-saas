"use client";

// Páginas: tabla con visitas, visitantes y conversión de cada página del sitio, ordenable.
import { useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink } from 'lucide-react';
import { useMarketing } from './Contexto';
import * as api from './api';
import { num, pct, tasa } from './stats';
import { Cabecera, Estado, nombrePagina, SITIO, useDatos } from './comun';

const COLS = [['ruta', 'Página'], ['visitas', 'Vistas'], ['visitantes', 'Visitantes'], ['conversiones', 'Conversiones'], ['tasa', 'Conversión']];

export default function Paginas() {
  const { desde, hasta, dias } = useMarketing();
  const { datos: r, error, cargando } = useDatos(() => api.resumen(desde, hasta), [desde.getTime(), hasta.getTime()]);
  const [orden, setOrden] = useState(['visitas', -1]);

  const filas = (r?.paginas || []).filter((p) => p.visitas).map((p) => ({ ...p, tasa: tasa(p.conversiones, p.visitantes) }));
  filas.sort((a, b) => {
    const [k, d] = orden;
    return (k === 'ruta' ? nombrePagina(a.ruta).localeCompare(nombrePagina(b.ruta)) : a[k] - b[k]) * d;
  });
  const max = Math.max(1, ...filas.map((f) => f.visitas));

  return (
    <>
      <Cabecera titulo="Páginas" bajada={`En qué páginas entra más gente y cuáles convierten mejor (últimos ${dias} días). Toca una columna para ordenar.`} />
      <Estado cargando={cargando} error={error}>
        {r && (
          <section className="adm-card is-flush">
            {filas.length === 0 ? <div className="adm-vacio">Todavía no hay visitas en este período.</div> : (
              <div className="adm-tabla-wrap">
                <table className="adm-tabla">
                  <thead>
                    <tr>{COLS.map(([k, t]) => (
                      <th key={k} scope="col" aria-sort={orden[0] === k ? (orden[1] > 0 ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => setOrden(([ok, od]) => [k, ok === k ? -od : k === 'ruta' ? 1 : -1])}>
                          {t}{orden[0] === k && (orden[1] > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                        </button>
                      </th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.ruta}>
                        <th scope="row">
                          <span className="adm-pag">{nombrePagina(f.ruta)}<a href={`${SITIO}${f.ruta}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${f.ruta}`}><ExternalLink size={13} /></a></span>
                          <small>{f.ruta}</small>
                          <i className="adm-pag-bar" style={{ width: `${(f.visitas / max) * 100}%` }} />
                        </th>
                        <td>{num(f.visitas)}</td>
                        <td>{num(f.visitantes)}</td>
                        <td>{num(f.conversiones)}</td>
                        <td><span className={`adm-tasa${f.tasa >= 0.05 ? ' is-alta' : ''}`}>{pct(f.tasa)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </Estado>
    </>
  );
}
