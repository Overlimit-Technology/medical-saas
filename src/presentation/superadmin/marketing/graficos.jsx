"use client";

// Gráficos del dashboard en SVG/CSS, sin librerías: línea por día, barras horizontales, embudo y tarjetas de KPI.
import { useState } from 'react';
import { num, pct } from './stats';

export function Kpi({ titulo, valor, detalle, icono: Icono }) {
  return (
    <div className="adm-kpi">
      <span className="adm-kpi-t">{Icono && <Icono size={16} aria-hidden="true" />}{titulo}</span>
      <b className="adm-kpi-v">{valor}</b>
      {detalle && <span className="adm-kpi-d">{detalle}</span>}
    </div>
  );
}

const fechaCorta = (dia) => new Date(`${dia}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

/** Línea por día. series: [{ nombre, clave, color }], datos: [{ dia, [clave]: n }] */
export function Linea({ datos, series, alto = 240 }) {
  const [hover, setHover] = useState(null);
  const W = 800, H = alto, pad = { t: 16, r: 12, b: 28, l: 40 };
  if (!datos.length) return <div className="adm-vacio">Todavía no hay datos en este período.</div>;
  const max = Math.max(1, ...datos.flatMap((d) => series.map((s) => d[s.clave] || 0)));
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  const tope = Math.ceil(max / paso) * paso;
  const x = (i) => pad.l + (datos.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (datos.length - 1));
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / tope);
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(tope * f));
  const cadaN = Math.ceil(datos.length / 8);
  return (
    <div className="adm-linea" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gráfico por día: ${series.map((s) => s.nombre).join(' y ')}`}>
        {marcas.map((m) => <g key={m}><line x1={pad.l} x2={W - pad.r} y1={y(m)} y2={y(m)} className="adm-eje" /><text x={pad.l - 8} y={y(m) + 4} textAnchor="end" className="adm-eje-t">{num(m)}</text></g>)}
        {datos.map((d, i) => (i % cadaN === 0 ? <text key={d.dia} x={x(i)} y={H - 6} textAnchor="middle" className="adm-eje-t">{fechaCorta(d.dia)}</text> : null))}
        {series.map((s) => {
          const pts = datos.map((d, i) => `${x(i)},${y(d[s.clave] || 0)}`);
          return (
            <g key={s.clave}>
              {s.relleno && <path d={`M${x(0)},${y(0)} L${pts.join(' L')} L${x(datos.length - 1)},${y(0)} Z`} fill={s.color} opacity=".12" />}
              <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="adm-cursor" />}
        {hover != null && series.map((s) => <circle key={s.clave} cx={x(hover)} cy={y(datos[hover][s.clave] || 0)} r="4.5" fill={s.color} stroke="var(--adm-card)" strokeWidth="2" />)}
        {datos.map((d, i) => <rect key={d.dia} x={x(i) - (W - pad.l - pad.r) / datos.length / 2} y={0} width={(W - pad.l - pad.r) / datos.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {hover != null && (
        <div className="adm-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{fechaCorta(datos[hover].dia)}</b>
          {series.map((s) => <span key={s.clave}><i style={{ background: s.color }} />{s.nombre}: {num(datos[hover][s.clave])}</span>)}
        </div>
      )}
      <div className="adm-leyenda">{series.map((s) => <span key={s.clave}><i style={{ background: s.color }} />{s.nombre}</span>)}</div>
    </div>
  );
}

/** Barras horizontales: filas [{ etiqueta, valor, extra }] */
export function Barras({ filas, formato = num, vacio = 'Sin datos en este período.' }) {
  if (!filas.length) return <div className="adm-vacio">{vacio}</div>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="adm-barras">
      {filas.map((f) => (
        <li key={f.etiqueta}>
          <div className="adm-barras-l"><span title={f.etiqueta}>{f.etiqueta}</span><b>{formato(f.valor)}</b></div>
          <div className="adm-barras-b"><i style={{ width: `${(f.valor / max) * 100}%` }} /></div>
          {f.extra && <small>{f.extra}</small>}
        </li>
      ))}
    </ul>
  );
}

/** Embudo: pasos [{ etiqueta, valor }] — muestra el % respecto del primer paso */
export function Embudo({ pasos }) {
  const base = pasos[0]?.valor || 0;
  return (
    <ol className="adm-embudo">
      {pasos.map((p, i) => (
        <li key={p.etiqueta}>
          <div className="adm-embudo-l"><span>{p.etiqueta}</span><b>{num(p.valor)}</b><small>{i === 0 ? '100%' : pct(base ? p.valor / base : 0, 0)}</small></div>
          <div className="adm-embudo-b"><i style={{ width: `${base ? Math.max(2, (p.valor / base) * 100) : 0}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}
