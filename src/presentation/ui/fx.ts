"use client";

/**
 * Efectos de movimiento de la app, con los mismos tiempos y curvas de la referencia Solvik (GSAP).
 * Todo respeta "menos movimiento": en ese caso los valores quedan en su estado final sin animar.
 *
 * - riseIn:    filas y datos de cabecera que suben (y 12, 0.55 s, stagger 45 ms).
 * - cardsIn:   tarjetas grandes que suben con leve escala (y 34, 0.9 s, stagger 70 ms).
 * - tilesIn:   mosaicos con giro alterno ±3° y rebote (back.out 1.4).
 * - splitTitle: letras del titulo que suben girando desde abajo (0.85 s, stagger 22 ms).
 * - popIn:     insignias y puntos que aparecen con rebote fuerte (back.out 3).
 * - flash:     una cifra que cambia salta y destella.
 * - floatUp:   texto que sube y se desvanece sobre un elemento ("+$120.000").
 * - countTo:   cifra que cuenta de su valor anterior al nuevo.
 * - bump:      icono que late al recibir algo.
 * - magnetic:  boton que sigue levemente al puntero.
 */
import gsap from "gsap";

export { gsap };

export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Duracion: 0 con "menos movimiento". */
export const d = (s: number) => (reduced() ? 0 : s);

type Targets = Element | Element[] | NodeListOf<Element> | null | undefined;
const list = (t: Targets): Element[] => (!t ? [] : t instanceof Element ? [t] : Array.from(t));

export function riseIn(t: Targets, { x = 0, y = 12, stagger = 0.045, delay = 0 } = {}) {
  const els = list(t);
  if (!els.length) return;
  gsap.fromTo(els, { opacity: 0, x, y }, { opacity: 1, x: 0, y: 0, duration: d(0.55), ease: "power3.out", stagger: d(stagger), delay: d(delay), clearProps: "transform,opacity" });
}

export function cardsIn(t: Targets, { y = 34, stagger = 0.07, delay = 0 } = {}) {
  const els = list(t);
  if (!els.length) return;
  gsap.fromTo(
    els,
    { opacity: 0, y, scale: 0.985 },
    { opacity: 1, y: 0, scale: 1, duration: d(0.9), ease: "power3.out", stagger: d(stagger), delay: d(delay), clearProps: "transform,opacity" }
  );
}

export function tilesIn(t: Targets, { stagger = 0.06, delay = 0 } = {}) {
  const els = list(t);
  if (!els.length) return;
  gsap.fromTo(
    els,
    { opacity: 0, y: 40, rotation: (i: number) => (i % 2 ? 3 : -3), scale: 0.94 },
    { opacity: 1, y: 0, rotation: 0, scale: 1, duration: d(0.8), ease: "back.out(1.4)", stagger: d(stagger), delay: d(delay), clearProps: "transform,opacity" }
  );
}

/** Parte el texto en letras (una sola vez) y las hace subir girando. El texto real queda en aria-label. */
export function splitTitle(el: HTMLElement | null, delay = 0) {
  if (!el || reduced()) return;
  if (!el.dataset.split) {
    const text = el.textContent ?? "";
    el.setAttribute("aria-label", text);
    el.dataset.split = "1";
    const walk = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const word of (child.textContent ?? "").split(/(\s+)/)) {
            if (!word) continue;
            if (/^\s+$/.test(word)) {
              frag.append(document.createTextNode(word));
              continue;
            }
            const w = document.createElement("span");
            w.className = "zs-word";
            w.setAttribute("aria-hidden", "true");
            for (const ch of word) {
              const c = document.createElement("span");
              c.className = "zs-ch";
              c.textContent = ch;
              w.append(c);
            }
            frag.append(w);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      }
    };
    walk(el);
  }
  gsap.fromTo(
    el.querySelectorAll(".zs-ch"),
    { yPercent: 115, rotation: 6 },
    { yPercent: 0, rotation: 0, duration: 0.85, ease: "power4.out", stagger: 0.022, delay, clearProps: "transform" }
  );
}

export function popIn(t: Targets, { from = 0.6, delay = 0, stagger = 0.05 } = {}) {
  const els = list(t);
  if (!els.length || reduced()) return;
  gsap.fromTo(els, { scale: from, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(3)", delay, stagger, overwrite: "auto", clearProps: "transform,opacity" });
}

export function flash(el: Element | null) {
  if (!el) return;
  el.classList.remove("zs-flash");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("zs-flash");
  if (!reduced()) gsap.fromTo(el, { y: -4, scale: 1.06 }, { y: 0, scale: 1, duration: 0.55, ease: "back.out(2.4)", overwrite: "auto", clearProps: "transform" });
}

export function floatUp(over: Element | null, text: string) {
  if (!over || reduced()) return;
  const r = over.getBoundingClientRect();
  const span = Object.assign(document.createElement("span"), { className: "zs-float-up", textContent: text });
  span.setAttribute("aria-hidden", "true");
  Object.assign(span.style, { left: `${r.left + r.width / 2}px`, top: `${r.top}px` });
  document.body.append(span);
  gsap.fromTo(
    span,
    { opacity: 0, y: 6, xPercent: -50, scale: 0.9 },
    {
      keyframes: [
        { opacity: 1, y: -12, scale: 1, duration: 0.35, ease: "back.out(2)" },
        { opacity: 0, y: -40, duration: 0.8, ease: "power2.in", delay: 0.6 },
      ],
      onComplete: () => span.remove(),
    }
  );
}

const counters = new WeakMap<Element, { v: number }>();
export function countTo(el: Element | null, to: number, format: (n: number) => string, { duration = 1.2, delay = 0, from }: { duration?: number; delay?: number; from?: number } = {}) {
  if (!el) return;
  let s = counters.get(el);
  if (!s) counters.set(el, (s = { v: from ?? 0 }));
  if (from !== undefined) s.v = from;
  gsap.killTweensOf(s);
  if (reduced() || !duration || s.v === to) {
    s.v = to;
    el.textContent = format(to);
    return;
  }
  const state = s;
  el.textContent = format(state.v);
  gsap.to(state, { v: to, duration, delay, ease: "power3.out", onUpdate: () => { el.textContent = format(state.v); }, onComplete: () => { el.textContent = format(to); } });
}

export function bump(el: Element | null) {
  if (!el || reduced()) return;
  const t = el.querySelector("svg") ?? el;
  gsap.fromTo(t, { scale: 0.72 }, { scale: 1, duration: 0.55, ease: "back.out(3)", overwrite: true });
}

/** Boton magnetico: se corre hasta un cuarto de la distancia al puntero. Devuelve la limpieza. */
export function magnetic(el: HTMLElement | null) {
  if (!el || !window.matchMedia("(hover: hover)").matches) return () => {};
  const qx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
  const qy = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
  const move = (e: PointerEvent) => {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    qx((e.clientX - r.left - r.width / 2) * 0.24);
    qy((e.clientY - r.top - r.height / 2) * 0.3);
  };
  const leave = () => {
    qx(0);
    qy(0);
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", leave);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", leave);
  };
}

/**
 * Reacomoda con FLIP: mide, aplica el cambio de DOM (o espera el render) y anima cada elemento
 * desde donde estaba. Los que no estaban aparecen con un fundido escalonado.
 */
export function flipFrom(before: Map<string, DOMRect>, els: HTMLElement[], key: (el: HTMLElement) => string, { duration = 0.5, ease = "power3.inOut" } = {}) {
  if (reduced()) return;
  let fresh = 0;
  for (const el of els) {
    const was = before.get(key(el));
    if (!was) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, delay: Math.min(fresh++, 12) * 0.02, clearProps: "opacity" });
      continue;
    }
    const now = el.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) gsap.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration, ease, clearProps: "transform" });
  }
}
export const measure = (els: HTMLElement[], key: (el: HTMLElement) => string) => new Map(els.map((el) => [key(el), el.getBoundingClientRect()]));
