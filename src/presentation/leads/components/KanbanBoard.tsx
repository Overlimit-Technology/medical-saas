"use client";

/**
 * Tablero del CRM con la coreografia de arrastre de la referencia Solvik (GSAP):
 * - Al tomar una tarjeta se levanta (escala 1,04 con rebote) y proyecta sombra; queda un hueco punteado.
 * - Sigue al puntero con un leve retraso y se inclina segun la velocidad (hasta ±10°).
 * - Las tarjetas de la columna destino se corren para hacerle espacio; la columna se tiñe de su color.
 * - Cerca de los bordes el tablero y la columna se desplazan solos.
 * - Al soltar en una columna se asienta en su hueco con un pequeño rebote.
 * - "Ganado" y "Perdido" son zonas de cierre: la tarjeta se encoge girando hacia la zona, la zona rebota
 *   (elastico), y en Ganado sube "+$" y el total cuenta. Un aviso permite deshacer.
 * En pantallas tactiles se toma con una pulsacion larga (280 ms).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Trophy, X } from "lucide-react";
import type { Lead } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";
import { bump, countTo, d, flash, floatUp, gsap, reduced, riseIn, tilesIn } from "@/presentation/ui/fx";
import { toast } from "@/presentation/ui/toast";
import KanbanCard from "./KanbanCard";

type Props = {
  columns: PipelineColumn[];
  leads: Lead[];
  onLeadClick: (id: string) => void;
  onMove: (leadId: string, toColumnId: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  /** Abre la vista de tabla (para ver los leads cerrados). */
  onShowTable?: () => void;
};

const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");
const money = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const isWon = (c: PipelineColumn) => c.name.toLowerCase().includes("ganad");
const isLost = (c: PipelineColumn) => c.name.toLowerCase().includes("perdid");

type Drag = { id: string; col: string; index: number };
type Target = { kind: "col"; col: string } | { kind: "end"; col: string; won: boolean } | null;

export default function KanbanBoard({ columns, leads, onLeadClick, onMove, onArchive, onDelete, onShowTable }: Props) {
  const wonCol = columns.find(isWon);
  const lostCol = columns.find(isLost);
  const openCols = columns.filter((c) => c !== wonCol && c !== lostCol);
  const boardRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<Target>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const lastDrop = useRef(0);
  // "Deshacer" llega segundos despues: usa siempre la version actual de onMove (la vieja ve los datos de antes).
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  // ---------------------------------------------------------------- reparto en columnas
  const byCol = useMemo(() => {
    const m = new Map<string, Lead[]>(columns.map((c) => [c.id, []]));
    for (const l of leads) m.get(l.columnId)?.push(l);
    return m;
  }, [columns, leads]);

  /** Lo que se dibuja: durante el arrastre, el lead arrastrado es un hueco en su posicion destino. */
  const view = useMemo(() => {
    const m = new Map<string, Array<{ lead: Lead; hole: boolean }>>();
    for (const c of openCols) {
      const list = (byCol.get(c.id) ?? []).filter((l) => l.id !== drag?.id).map((lead) => ({ lead, hole: false }));
      if (drag && drag.col === c.id) {
        const lead = leads.find((l) => l.id === drag.id);
        if (lead) list.splice(Math.min(drag.index, list.length), 0, { lead, hole: true });
      }
      m.set(c.id, list);
    }
    return m;
  }, [byCol, openCols, drag, leads]);

  // ---------------------------------------------------------------- FLIP de todas las tarjetas
  const rects = useRef(new Map<string, DOMRect>());
  const measureAll = useCallback(() => {
    const m = new Map<string, DOMRect>();
    boardRef.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => m.set(el.dataset.card!, el.getBoundingClientRect()));
    rects.current = m;
  }, []);
  useLayoutEffect(() => {
    const before = rects.current;
    if (!reduced() && before.size) {
      const dragging = !!dragRef.current;
      boardRef.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
        const was = before.get(el.dataset.card!);
        if (!was) return;
        const now = el.getBoundingClientRect();
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        gsap.killTweensOf(el, "x,y");
        gsap.fromTo(el, { x: dx, y: dy }, dragging ? { x: 0, y: 0, duration: 0.34, ease: "power3.out", clearProps: "transform" } : { x: 0, y: 0, duration: 0.5, ease: "power3.inOut", clearProps: "transform" });
      });
    }
    measureAll();
  });

  // Entrada: columnas con giro alterno y luego sus tarjetas.
  useEffect(() => {
    tilesIn(colsRef.current?.querySelectorAll("[data-col]"), { stagger: 0.06 });
    riseIn(colsRef.current?.querySelectorAll("[data-card]"), { y: 16, stagger: 0.025, delay: 0.25 });
  }, []);

  // Conteos y totales: cuentan y destellan cuando cambian.
  const prevCounts = useRef(new Map<string, number>());
  useEffect(() => {
    for (const c of columns) {
      const n = (byCol.get(c.id) ?? []).length;
      const was = prevCounts.current.get(c.id);
      const root = boardRef.current?.querySelector(`[data-colid="${c.id}"]`);
      if (was !== undefined && was !== n) flash(root?.querySelector("[data-count]") ?? null);
      const total = (byCol.get(c.id) ?? []).reduce((s, l) => s + (l.estimatedBudget ?? 0), 0);
      countTo(root?.querySelector("[data-total]") ?? null, total, money, { duration: was === undefined ? 1.2 : 0.9 });
      prevCounts.current.set(c.id, n);
    }
  }, [byCol, columns]);

  // ---------------------------------------------------------------- arrastre
  const press = useRef<{ id: string; x: number; y: number; pid: number; touch: boolean; timer: number; el: HTMLElement } | null>(null);
  const live = useRef<{
    id: string;
    from: string;
    fly: HTMLDivElement;
    offX: number;
    offY: number;
    x: number;
    y: number;
    lastX: number;
    lastT: number;
    vx: number;
    qx: (v: number) => void;
    qy: (v: number) => void;
    qr: (v: number) => void;
    target: Target;
    tick: () => void;
  } | null>(null);

  const colAccent = (colId: string) => columns.find((c) => c.id === colId)?.color ?? "#50c9d5";

  const hitTest = (x: number, y: number): Target => {
    const board = boardRef.current;
    if (!board) return null;
    for (const el of Array.from(board.querySelectorAll<HTMLElement>("[data-end]"))) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { kind: "end", col: el.dataset.end!, won: el.dataset.won === "1" };
    }
    const area = colsRef.current?.getBoundingClientRect();
    if (!area || y < area.top - 40 || y > area.bottom + 40) return null;
    for (const el of Array.from(board.querySelectorAll<HTMLElement>("[data-col]"))) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8) return { kind: "col", col: el.dataset.col! };
    }
    return null;
  };

  /** Indice del hueco en la columna: antes de la primera tarjeta cuyo centro queda bajo el puntero. */
  const indexIn = (colId: string, y: number, id: string) => {
    const cards = Array.from(boardRef.current?.querySelectorAll<HTMLElement>(`[data-col="${colId}"] [data-card]`) ?? []).filter((el) => el.dataset.card !== id);
    const i = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return i < 0 ? cards.length : i;
  };

  const retarget = (t: Target) => {
    const s = live.current;
    if (!s) return;
    const same = s.target?.kind === t?.kind && s.target?.col === t?.col;
    s.target = t;
    if (!same) {
      setOver(t);
      gsap.to(s.fly, { scale: t?.kind === "end" ? 0.9 : 1.04, duration: d(0.3), ease: "back.out(2)" });
      // La franja de color de la tarjeta toma el color de la columna destino.
      const stripe = s.fly.querySelector<HTMLElement>("[data-accent]");
      if (stripe) stripe.style.background = t?.kind === "end" ? (t.won ? "#16a34a" : "#94a3b8") : colAccent(t?.col ?? s.from);
    }
    if (t?.kind === "end" && dragRef.current?.col) {
      // Sobre una zona de cierre el hueco se cierra: la tarjeta ya no vuelve a una columna.
      measureAll();
      setDrag({ id: s.id, col: "", index: 0 });
    }
    if (t?.kind === "col") {
      const index = indexIn(t.col, s.y, s.id);
      const cur = dragRef.current;
      if (!cur || cur.col !== t.col || cur.index !== index) {
        measureAll();
        setDrag({ id: s.id, col: t.col, index });
      }
    }
  };

  const begin = (id: string, el: HTMLElement, x: number, y: number, pid: number, touch: boolean) => {
    const r = el.getBoundingClientRect();
    const fly = document.createElement("div");
    fly.className = "zs-fly is-lifted";
    Object.assign(fly.style, { width: `${r.width}px`, height: `${r.height}px` });
    const face = el.cloneNode(true) as HTMLElement;
    face.removeAttribute("data-card");
    face.style.transform = "";
    fly.append(face);
    document.body.append(fly);
    const offX = x - r.left;
    const offY = y - r.top;
    gsap.set(fly, { x: r.left, y: r.top, transformOrigin: `${offX}px ${offY}px` });
    gsap.to(fly, { scale: 1.04, duration: d(0.28), ease: "back.out(2.2)" });
    if (touch) navigator.vibrate?.(8);
    document.documentElement.classList.add("zs-dragging");
    const from = leads.find((l) => l.id === id)?.columnId ?? "";
    const tick = () => {
      const s = live.current;
      if (!s) return;
      s.vx *= 0.88;
      if (!reduced()) s.qr(Math.max(-10, Math.min(10, s.vx * 7)));
      // Desplazamiento automatico cerca de los bordes.
      const scroller = colsRef.current;
      if (scroller && s.target?.kind !== "end" && scroller.scrollWidth > scroller.clientWidth + 2) {
        const b = scroller.getBoundingClientRect();
        const dir = s.x < b.left + 56 ? -1 : s.x > b.right - 56 ? 1 : 0;
        if (dir) scroller.scrollLeft += dir * 12;
      }
      if (s.target?.kind === "col") {
        const body = boardRef.current?.querySelector<HTMLElement>(`[data-col="${s.target.col}"] [data-body]`);
        if (body) {
          const b = body.getBoundingClientRect();
          const dir = s.y < b.top + 48 ? -1 : s.y > b.bottom - 48 ? 1 : 0;
          if (dir && s.y > b.top - 20 && s.y < b.bottom + 20) body.scrollTop += dir * 10;
        }
      }
    };
    live.current = {
      id,
      from,
      fly,
      offX,
      offY,
      x,
      y,
      lastX: x,
      lastT: performance.now(),
      vx: 0,
      qx: gsap.quickTo(fly, "x", { duration: d(0.16) || 0.001, ease: "power3.out" }),
      qy: gsap.quickTo(fly, "y", { duration: d(0.16) || 0.001, ease: "power3.out" }),
      qr: gsap.quickTo(fly, "rotation", { duration: d(0.4) || 0.001, ease: "power3.out" }),
      target: null,
      tick,
    };
    gsap.ticker.add(tick);
    try {
      boardRef.current?.setPointerCapture(pid);
    } catch {}
    measureAll();
    setDrag({ id, col: from, index: (byCol.get(from) ?? []).findIndex((l) => l.id === id) });
    retarget({ kind: "col", col: from });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (live.current || press.current || e.button !== 0 || !e.isPrimary) return;
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>("[data-card]");
    if (!card || t.closest("button, a, input")) return;
    const touch = e.pointerType === "touch";
    press.current = { id: card.dataset.card!, x: e.clientX, y: e.clientY, pid: e.pointerId, touch, timer: 0, el: card };
    if (touch) {
      card.classList.add("is-pressing");
      press.current.timer = window.setTimeout(() => {
        const p = press.current;
        if (!p) return;
        p.el.classList.remove("is-pressing");
        press.current = null;
        begin(p.id, p.el, p.x, p.y, p.pid, true);
      }, 280);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (p && !live.current && e.pointerId === p.pid) {
      const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (p.touch) {
        if (dist > 8) cancelPress();
        return;
      }
      if (dist <= 5) return;
      press.current = null;
      begin(p.id, p.el, p.x, p.y, p.pid, false);
    }
    const s = live.current;
    if (!s) return;
    const now = performance.now();
    const dt = Math.max(1, now - s.lastT);
    s.vx = s.vx * 0.6 + ((e.clientX - s.lastX) / dt) * 0.4;
    s.lastX = e.clientX;
    s.lastT = now;
    s.x = e.clientX;
    s.y = e.clientY;
    s.qx(s.x - s.offX);
    s.qy(s.y - s.offY);
    retarget(hitTest(s.x, s.y));
  };

  const cancelPress = () => {
    const p = press.current;
    if (!p) return;
    clearTimeout(p.timer);
    p.el.classList.remove("is-pressing");
    press.current = null;
  };

  const finish = (cancel: boolean) => {
    const s = live.current;
    if (!s) return;
    live.current = null;
    lastDrop.current = performance.now();
    gsap.ticker.remove(s.tick);
    document.documentElement.classList.remove("zs-dragging");
    setOver(null);
    const lead = leads.find((l) => l.id === s.id);
    const t = cancel ? null : s.target;

    // Zona de cierre: la tarjeta se encoge girando hacia el centro de la zona.
    if (t?.kind === "end" && lead) {
      const zone = boardRef.current?.querySelector<HTMLElement>(`[data-end="${t.col}"]`);
      const z = zone?.getBoundingClientRect();
      if (zone && z) {
        const w = s.fly.offsetWidth;
        const h = s.fly.offsetHeight;
        const k = 0.22;
        gsap
          .timeline({ onComplete: () => s.fly.remove() })
          .to(s.fly, {
            x: z.left + z.width / 2 - s.offX - (w / 2 - s.offX) * k,
            y: z.top + z.height / 2 - s.offY - (h / 2 - s.offY) * k,
            scale: k,
            rotation: t.won ? 8 : -8,
            duration: d(0.55),
            ease: "power3.in",
          })
          .to(s.fly, { opacity: 0, duration: d(0.2) }, "-=0.18")
          .add(() => {
            zone.classList.add("is-hit");
            if (!reduced()) gsap.fromTo(zone, { scale: 1.06 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.45)", clearProps: "transform" });
            gsap.delayedCall(0.6, () => zone.classList.remove("is-hit"));
            if (t.won) {
              floatUp(zone, `+${money(lead.estimatedBudget ?? 0)}`);
              bump(zone.querySelector("[data-end-ico]"));
            }
          }, "-=0.12");
      } else s.fly.remove();
      setDrag(null);
      const from = s.from;
      onMove(lead.id, t.col);
      toast(t.won ? `${lead.name || "Lead"} ganado · ${money(lead.estimatedBudget ?? 0)}` : `${lead.name || "Lead"} marcado como perdido`, {
        icon: t.won ? "trophy" : "check",
        undo: () => moveRef.current(lead.id, from),
      });
      return;
    }

    // Columna (o cancelar): se asienta sobre su hueco con un pequeño rebote.
    const dest = t?.kind === "col" ? t.col : s.from;
    if (!t) {
      measureAll();
      setDrag({ id: s.id, col: s.from, index: (byCol.get(s.from) ?? []).findIndex((l) => l.id === s.id) });
    }
    requestAnimationFrame(() => {
      const hole = boardRef.current?.querySelector<HTMLElement>(`[data-card="${s.id}"]`)?.getBoundingClientRect();
      gsap.killTweensOf(s.fly, "x,y,rotation,scale");
      s.fly.classList.add("is-settling");
      gsap.to(s.fly, {
        x: hole?.left ?? 0,
        y: hole?.top ?? 0,
        rotation: 0,
        scale: 1,
        duration: d(0.42),
        ease: "back.out(1.25)",
        onComplete: () => {
          s.fly.remove();
          measureAll();
          setDrag(null);
        },
      });
    });
    if (lead && dest !== s.from) {
      const from = s.from;
      onMove(lead.id, dest);
      toast(`Movido a ${columns.find((c) => c.id === dest)?.name ?? "otra etapa"}`, { undo: () => moveRef.current(lead.id, from) });
    }
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && finish(true);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  const endZone = (col: PipelineColumn | undefined, won: boolean) => {
    if (!col) return null;
    const list = byCol.get(col.id) ?? [];
    const hot = over?.kind === "end" && over.col === col.id;
    return (
      <button
        type="button"
        data-end={col.id}
        data-won={won ? "1" : "0"}
        data-colid={col.id}
        onClick={onShowTable}
        className={cx("zs-end relative flex flex-1 flex-col items-center justify-center gap-2.5 rounded-[22px] border-[1.5px] border-dashed px-2 py-4 text-center transition-colors", hot && "is-over")}
        style={{ "--t": won ? "#16a34a" : "#94a3b8" } as CSSProperties}
        title="Ver en la tabla"
      >
        <span data-end-ico className={cx("grid h-12 w-12 place-items-center rounded-full", won ? "bg-[#16a34a] text-white" : "bg-slate-100 text-slate-500")}>
          {won ? <Trophy className="h-5 w-5" strokeWidth={2} /> : <X className="h-5 w-5" strokeWidth={2} />}
        </span>
        <span className="grid gap-0.5">
          <b className="font-display text-[15px] font-bold text-slate-900">{col.name}</b>
          <small className="text-[11.5px] text-slate-500">
            <span data-count>{list.length}</span> {list.length === 1 ? "lead" : "leads"}
          </small>
          {won ? <b data-total className="text-[12.5px] font-bold tabular-nums text-slate-900" /> : null}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={boardRef}
      className="flex h-full gap-3 pb-3"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (live.current ? finish(false) : cancelPress())}
      onPointerCancel={() => (live.current ? finish(true) : cancelPress())}
      onClickCapture={(e) => {
        // El clic que termina un arrastre no abre la tarjeta.
        if (performance.now() - lastDrop.current < 250) e.stopPropagation();
      }}
    >
      <div ref={colsRef} className="flex min-w-0 flex-1 gap-3 overflow-x-auto pr-1">
        {openCols.map((col) => {
          const items = view.get(col.id) ?? [];
          const hot = over?.kind === "col" && over.col === col.id;
          return (
            <section
              key={col.id}
              data-col={col.id}
              data-colid={col.id}
              className={cx("zs-col relative flex w-[280px] shrink-0 flex-col rounded-[22px] border border-slate-200/80 bg-slate-50/80", hot && "is-over")}
              style={{ "--t": col.color } as CSSProperties}
            >
              <div className="flex items-center gap-2.5 px-4 pb-1 pt-4">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color, boxShadow: `0 0 0 3px ${col.color}38` }} />
                <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{col.name}</span>
                <span data-count className="inline-grid h-5 min-w-[22px] place-items-center rounded-full bg-white px-1.5 text-[11px] font-bold tabular-nums text-slate-600 shadow-sm">
                  {(byCol.get(col.id) ?? []).length}
                </span>
                <b data-total className="ml-auto whitespace-nowrap text-[12px] font-bold tabular-nums text-slate-500" />
              </div>
              <div data-body className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 pt-2">
                {items.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-500">Suelta un lead aquí</div>
                ) : null}
                {items.map(({ lead, hole }) => (
                  <div key={lead.id} data-card={lead.id} className={cx("zs-card relative rounded-xl", hole && "is-hole")}>
                    <KanbanCard
                      lead={lead}
                      columnColor={col.color}
                      onClick={() => onLeadClick(lead.id)}
                      onArchive={() => onArchive(lead.id)}
                      onDelete={() => onDelete(lead.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {wonCol || lostCol ? (
        <div className="flex w-[148px] shrink-0 flex-col gap-3">
          {endZone(wonCol, true)}
          {endZone(lostCol, false)}
        </div>
      ) : null}
    </div>
  );
}
