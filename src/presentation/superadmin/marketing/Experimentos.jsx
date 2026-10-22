"use client";

// Tests A/B: crear, activar y leer resultados. Dos tipos:
//   · Cambiar textos: el mismo URL muestra otro título, texto o botón (elementos de src/lib/ab-elementos.js o un selector CSS)
//   · Otra página: parte del tráfico se manda a otra URL (por ejemplo, otra landing)
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, ExternalLink, Pause, Play, Plus, Square, Trash2, Trophy } from 'lucide-react';
import * as api from './api';
import { ELEMENTOS, OBJETIVOS } from './ab-elementos';
import { diasDesde, num, pct, probMejor, tasa, veredicto } from './stats';
import { Cabecera, Estado, nombrePagina, PAGINAS_SITIO, SITIO, useDatos } from './comun';

const LETRAS = ['A', 'B', 'C', 'D'];
const ESTADOS = { borrador: 'Borrador', activo: 'Activo', pausado: 'Pausado', terminado: 'Terminado' };
const nuevo = () => ({
  nombre: '', pagina: '/', tipo: 'contenido', estado: 'borrador', objetivo: 'cualquiera',
  variantes: [{ clave: 'A', nombre: 'Original', peso: 50, cambios: [] }, { clave: 'B', nombre: 'Variante B', peso: 50, cambios: [{ elemento: 'home-titulo', texto: '' }] }],
});

function Resultados({ exp }) {
  const { datos, error, cargando } = useDatos(() => api.statsExperimento(exp.id), [exp.id, exp.actualizado]);
  const filas = exp.variantes.map((v) => ({ variante: v.clave, nombre: v.nombre, ...(datos || []).find((d) => d.variante === v.clave) })).map((f) => ({ visitantes: 0, convertidos: 0, ...f }));
  const v = veredicto(filas);
  return (
    <Estado cargando={cargando} error={error}>
      {datos && (
        <div className="adm-res">
          <div className={`adm-veredicto is-${v.tono}`}>{v.ganador && <Trophy size={18} aria-hidden="true" />}<p>{v.texto}</p></div>
          <div className="adm-tabla-wrap">
            <table className="adm-tabla is-compacta">
              <thead><tr><th scope="col">Variante</th><th scope="col">Visitantes</th><th scope="col">Convirtieron</th><th scope="col">Conversión</th><th scope="col">vs. original</th><th scope="col">Prob. de ganarle</th></tr></thead>
              <tbody>
                {filas.map((f, i) => {
                  const t = tasa(f.convertidos, f.visitantes);
                  const t0 = tasa(filas[0].convertidos, filas[0].visitantes);
                  const p = i ? probMejor(filas[0], f) : null;
                  return (
                    <tr key={f.variante} className={v.ganador === f.variante ? 'is-ganador' : ''}>
                      <th scope="row"><span className={`adm-letra is-${f.variante}`}>{f.variante}</span>{f.nombre}</th>
                      <td>{num(f.visitantes)}</td>
                      <td>{num(f.convertidos)}</td>
                      <td><b>{pct(t)}</b><span className="adm-mini-bar"><i style={{ width: `${Math.min(100, t * 1000)}%` }} /></span></td>
                      <td>{i ? <span className={t >= t0 ? 'adm-sube' : 'adm-baja'}>{t0 ? `${t >= t0 ? '+' : ''}${pct((t - t0) / t0, 0)}` : '—'}</span> : 'Base'}</td>
                      <td>{i ? <span className="adm-prob"><i style={{ width: `${p * 100}%` }} /><b>{pct(p, 0)}</b></span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="adm-nota">La «probabilidad de ganarle» estima qué tan seguro es que esa variante convierte más que el original. Decide cuando pase de 95% y haya al menos 100 visitantes por variante.</p>
        </div>
      )}
    </Estado>
  );
}

function Editor({ inicial, alGuardar, alBorrar }) {
  const [e, setE] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState('');
  const set = (k, v) => setE((x) => ({ ...x, [k]: v }));
  const setVar = (i, k, v) => setE((x) => ({ ...x, variantes: x.variantes.map((y, j) => (j === i ? { ...y, [k]: v } : y)) }));
  const elementos = ELEMENTOS.filter((x) => x.pagina === e.pagina);
  const total = e.variantes.reduce((s, v) => s + (Number(v.peso) || 0), 0);
  const bloqueado = e.estado === 'activo';

  const repartir = () => setE((x) => { const n = x.variantes.length; return { ...x, variantes: x.variantes.map((v, i) => ({ ...v, peso: Math.floor(100 / n) + (i < 100 % n ? 1 : 0) })) }; });
  const agregarVariante = () => setE((x) => {
    const clave = LETRAS[x.variantes.length];
    const n = x.variantes.length + 1;
    return { ...x, variantes: [...x.variantes, { clave, nombre: `Variante ${clave}`, peso: 0, cambios: x.tipo === 'contenido' ? [{ elemento: elementos[0]?.id || '', texto: '' }] : [], url: '' }].map((v, i) => ({ ...v, peso: Math.floor(100 / n) + (i < 100 % n ? 1 : 0) })) };
  });
  const quitarVariante = (i) => setE((x) => ({ ...x, variantes: x.variantes.filter((_, j) => j !== i).map((v, j) => ({ ...v, clave: LETRAS[j] })) }));

  const validar = () => {
    if (!e.nombre.trim()) return 'Ponle un nombre al test.';
    if (e.variantes.length < 2) return 'Un test necesita al menos dos variantes.';
    if (total !== 100) return `El tráfico debe sumar 100% (ahora suma ${total}%).`;
    if (e.tipo === 'contenido' && e.variantes.slice(1).some((v) => !v.cambios?.some((c) => c.elemento && c.texto.trim()))) return 'Cada variante nueva necesita al menos un cambio con texto.';
    if (e.tipo === 'url' && e.variantes.slice(1).some((v) => !(v.url || '').startsWith('/'))) return 'Escribe la página de destino de cada variante (debe empezar con /).';
    return '';
  };
  const guardar = async (cambios = {}) => {
    const fila = { ...e, ...cambios };
    const msg = validar();
    if (msg && fila.estado !== 'borrador') { setError(msg); return; }
    if (!fila.nombre.trim()) { setError('Ponle un nombre al test.'); return; }
    setGuardando(true); setError('');
    try { const g = await api.guardar('experimentos', fila); setE(g); alGuardar(g); } catch (err) { setError(err.message); } finally { setGuardando(false); }
  };
  const copiarLink = (clave) => {
    const url = `${SITIO}${e.pagina}?zs_ab=${e.id}:${clave}`;
    navigator.clipboard?.writeText(url).then(() => { setCopiado(clave); setTimeout(() => setCopiado(''), 1500); });
  };

  return (
    <div className="adm-grid">
      <section className="adm-card is-wide">
        <div className="adm-form">
          <label className="adm-field is-wide"><span>Nombre del test</span><input value={e.nombre} onChange={(x) => set('nombre', x.target.value)} placeholder="Ej: Título de la Home que habla del dolor" disabled={bloqueado} /></label>
          <label className="adm-field"><span>Página donde corre</span>
            <select value={e.pagina} onChange={(x) => set('pagina', x.target.value)} disabled={bloqueado}>
              {[...new Set([...PAGINAS_SITIO, e.pagina])].map((p) => <option key={p} value={p}>{nombrePagina(p)} ({p})</option>)}
            </select>
          </label>
          <label className="adm-field"><span>Qué cuenta como éxito</span>
            <select value={e.objetivo} onChange={(x) => set('objetivo', x.target.value)} disabled={bloqueado}>{OBJETIVOS.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>
          </label>
          <fieldset className="adm-field is-wide adm-tipo" disabled={bloqueado}>
            <legend>Qué se prueba</legend>
            <label className={e.tipo === 'contenido' ? 'is-on' : ''}><input type="radio" checked={e.tipo === 'contenido'} onChange={() => set('tipo', 'contenido')} /><b>Cambiar textos</b><small>Misma página, otro título, texto o botón.</small></label>
            <label className={e.tipo === 'url' ? 'is-on' : ''}><input type="radio" checked={e.tipo === 'url'} onChange={() => set('tipo', 'url')} /><b>Otra página</b><small>Parte del tráfico va a otra dirección, por ejemplo otra landing.</small></label>
          </fieldset>
        </div>
      </section>

      {e.variantes.map((v, i) => (
        <section key={v.clave} className="adm-card adm-variante">
          <div className="adm-variante-h">
            <span className={`adm-letra is-${v.clave}`}>{v.clave}</span>
            <input className="adm-variante-n" value={v.nombre} onChange={(x) => setVar(i, 'nombre', x.target.value)} aria-label={`Nombre de la variante ${v.clave}`} disabled={bloqueado} />
            <label className="adm-peso"><input type="number" min="0" max="100" value={v.peso} onChange={(x) => setVar(i, 'peso', Number(x.target.value))} aria-label={`Porcentaje del tráfico para ${v.clave}`} disabled={bloqueado} />%</label>
            {i > 1 && !bloqueado && <button type="button" className="adm-icon-btn" onClick={() => quitarVariante(i)} aria-label={`Quitar variante ${v.clave}`}><Trash2 size={16} /></button>}
          </div>
          {i === 0 ? <p className="adm-nota">{e.tipo === 'url' ? `Se queda en ${e.pagina}.` : 'La página tal como está hoy. Sirve de comparación.'}</p> : e.tipo === 'url' ? (
            <label className="adm-field"><span>Mandar a</span><input value={v.url || ''} onChange={(x) => setVar(i, 'url', x.target.value)} placeholder="/l/mi-otra-landing" disabled={bloqueado} /></label>
          ) : (
            <div className="adm-cambios">
              {(v.cambios || []).map((c, k) => {
                const def = ELEMENTOS.find((x) => x.id === c.elemento);
                const propio = c.elemento && !def;
                const setC = (campo, valor) => setVar(i, 'cambios', v.cambios.map((y, j) => (j === k ? { ...y, [campo]: valor } : y)));
                return (
                  <div key={k} className="adm-cambio">
                    <label className="adm-field"><span>Elemento</span>
                      <select value={propio ? '__css' : c.elemento} onChange={(x) => setC('elemento', x.target.value === '__css' ? '.' : x.target.value)} disabled={bloqueado}>
                        {elementos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                        <option value="__css">Otro (selector CSS)</option>
                      </select>
                    </label>
                    {propio && <label className="adm-field"><span>Selector CSS</span><input value={c.elemento} onChange={(x) => setC('elemento', x.target.value)} placeholder=".pl-title" disabled={bloqueado} /></label>}
                    <label className="adm-field is-wide"><span>Texto nuevo</span><textarea rows={2} value={c.texto} onChange={(x) => setC('texto', x.target.value)} placeholder={def?.original || ''} disabled={bloqueado} /></label>
                    {def && <small className="adm-original">Hoy dice: «{def.original}»</small>}
                    {!bloqueado && <button type="button" className="adm-link" onClick={() => setVar(i, 'cambios', v.cambios.filter((_, j) => j !== k))}>Quitar cambio</button>}
                  </div>
                );
              })}
              {!bloqueado && <button type="button" className="adm-btn is-ghost is-sm" onClick={() => setVar(i, 'cambios', [...(v.cambios || []), { elemento: elementos[0]?.id || '.', texto: '' }])}><Plus size={15} />Agregar cambio</button>}
            </div>
          )}
          {e.id && e.estado === 'activo' && (
            <div className="adm-preview">
              <a href={`${SITIO}${e.pagina}?zs_ab=${e.id}:${v.clave}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Ver variante {v.clave}</a>
              <button type="button" className="adm-link" onClick={() => copiarLink(v.clave)}><Copy size={14} />{copiado === v.clave ? '¡Copiado!' : 'Copiar link'}</button>
            </div>
          )}
        </section>
      ))}

      <section className="adm-card is-wide adm-acciones">
        <div className="adm-acciones-info">
          <span className={total === 100 ? 'adm-sube' : 'adm-baja'}>Tráfico: {total}%</span>
          {!bloqueado && <button type="button" className="adm-link" onClick={repartir}>Repartir parejo</button>}
          {!bloqueado && e.variantes.length < 4 && <button type="button" className="adm-link" onClick={agregarVariante}>+ Agregar variante</button>}
          {bloqueado && <span className="adm-nota">Pausa el test para editarlo.</span>}
        </div>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-acciones-btns">
          {e.id && <button type="button" className="adm-btn is-ghost is-danger" onClick={() => alBorrar(e)} disabled={guardando}><Trash2 size={16} />Borrar</button>}
          {!bloqueado && <button type="button" className="adm-btn is-ghost" onClick={() => guardar()} disabled={guardando}>Guardar</button>}
          {e.estado !== 'activo' && e.estado !== 'terminado' && <button type="button" className="adm-btn" onClick={() => guardar({ estado: 'activo', inicio: e.inicio || new Date().toISOString() })} disabled={guardando}><Play size={16} />Activar test</button>}
          {e.estado === 'activo' && <button type="button" className="adm-btn is-ghost" onClick={() => guardar({ estado: 'pausado' })} disabled={guardando}><Pause size={16} />Pausar</button>}
          {(e.estado === 'activo' || e.estado === 'pausado') && <button type="button" className="adm-btn is-ghost" onClick={() => guardar({ estado: 'terminado', fin: new Date().toISOString() })} disabled={guardando}><Square size={16} />Terminar</button>}
        </div>
      </section>

      {e.id && (
        <section className="adm-card is-wide">
          <h2>Resultados</h2>
          <Resultados exp={e} />
        </section>
      )}
    </div>
  );
}

function Detalle({ id, lista, recargar, cargando }) {
  const ir = useRouter();
  const exp = id === 'nuevo' ? nuevo() : lista.find((x) => x.id === id);
  if (!exp && cargando) return <div className="adm-cargando" aria-label="Cargando" />;
  if (!exp) return <div className="adm-vacio">No encontramos ese test. <Link href="/super-admin/marketing/tests">Volver</Link></div>;
  const borrar = async (e) => {
    if (!window.confirm(`¿Borrar el test «${e.nombre}»? Sus resultados ya no se podrán ver.`)) return;
    await api.borrar('experimentos', e.id);
    recargar();
    ir.push('/super-admin/marketing/tests');
  };
  return (
    <>
      <Cabecera titulo={id === 'nuevo' ? 'Nuevo test A/B' : exp.nombre} bajada={id === 'nuevo' ? 'Elige qué cambiar, cuánto tráfico mandar a cada versión y qué cuenta como éxito.' : `${ESTADOS[exp.estado]} · ${nombrePagina(exp.pagina)}${exp.inicio ? ` · ${diasDesde(exp.inicio)} días` : ''}`}>
        <Link className="adm-btn is-ghost" href="/super-admin/marketing/tests"><ArrowLeft size={16} />Todos los tests</Link>
      </Cabecera>
      <Editor key={exp.id || 'nuevo'} inicial={exp} alBorrar={borrar} alGuardar={(g) => { recargar(); if (id === 'nuevo') ir.replace(`/super-admin/marketing/tests/${g.id}`); }} />
    </>
  );
}

function TarjetaTest({ e }) {
  const { datos } = useDatos(() => (e.estado === 'borrador' ? [] : api.statsExperimento(e.id)), [e.id, e.actualizado]);
  const filas = e.variantes.map((v) => ({ variante: v.clave, visitantes: 0, convertidos: 0, ...(datos || []).find((d) => d.variante === v.clave) }));
  const v = e.estado === 'borrador' ? null : veredicto(filas);
  const visitantes = filas.reduce((s, f) => s + f.visitantes, 0);
  return (
    <Link href={`/super-admin/marketing/tests/${e.id}`} className="adm-card adm-test">
      <div className="adm-test-h"><span className={`adm-estado is-${e.estado}`}>{ESTADOS[e.estado]}</span><small>{nombrePagina(e.pagina)} · {e.tipo === 'url' ? 'Otra página' : 'Textos'}</small></div>
      <h3>{e.nombre}</h3>
      <div className="adm-test-vars">{filas.map((f) => <span key={f.variante}><b className={`adm-letra is-${f.variante}`}>{f.variante}</b>{pct(tasa(f.convertidos, f.visitantes))}</span>)}</div>
      <p className={`adm-test-v is-${v?.tono || 'neutro'}`}>{v ? v.texto : 'Borrador: todavía no se muestra en el sitio.'}</p>
      <small className="adm-nota">{num(visitantes)} visitantes{e.inicio ? ` · ${diasDesde(e.inicio)} días` : ''}</small>
    </Link>
  );
}

// Lista de tests (/super-admin/marketing/tests)
export function ListaTests() {
  const { datos: lista, error, cargando } = useDatos(() => api.listar('experimentos'), []);
  return (
    <Estado cargando={cargando} error={error}>
      {lista && (
        <>
          <Cabecera titulo="Tests A/B" bajada="Prueba dos o más versiones de una página de zensya.cl con visitantes reales y quédate con la que más convierte.">
            <Link className="adm-btn" href="/super-admin/marketing/tests/nuevo"><Plus size={16} />Nuevo test</Link>
          </Cabecera>
          {lista.length === 0 ? (
            <section className="adm-card adm-empty">
              <h2>Todavía no hay tests</h2>
              <p>Empieza por algo simple: prueba dos títulos para la Home y mide cuál consigue más contactos por WhatsApp.</p>
              <Link className="adm-btn" href="/super-admin/marketing/tests/nuevo"><Plus size={16} />Crear el primer test</Link>
            </section>
          ) : <div className="adm-tests">{lista.map((e) => <TarjetaTest key={e.id} e={e} />)}</div>}
        </>
      )}
    </Estado>
  );
}

// Detalle o creación de un test (/super-admin/marketing/tests/[id])
export function DetalleTest({ id }) {
  const { datos: lista, error, cargando, recargar } = useDatos(() => (id === 'nuevo' ? [] : api.listar('experimentos')), [id]);
  return <Estado cargando={cargando} error={error}>{lista && <Detalle id={id} lista={lista} recargar={recargar} cargando={cargando} />}</Estado>;
}
