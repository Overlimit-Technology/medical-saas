"use client";

/**
 * Cifras que cuentan hasta su valor, como en la entrada del panel: el numero sube desde cero
 * al montarse y, si el dato cambia (otro periodo), pasa del valor anterior al nuevo.
 * Con "menos movimiento" se muestra el valor final de inmediato.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * La cifra arranca junto con los graficos de su tarjeta (--i heredado del CSS, mismo retraso que --zs-chart).
 */
function entranceDelay(el: Element | null) {
  // Igual que --zs-chart en globals.css.
  const i = el ? parseFloat(getComputedStyle(el).getPropertyValue("--i")) || 0 : 0;
  return 360 + i * 90;
}

export function useCountUp(value: number, el: RefObject<Element | null>, duration = 1800) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const from = useRef(0);
  const current = useRef(shown);
  const mounted = useRef(false);
  current.current = shown;

  useEffect(() => {
    if (!Number.isFinite(value) || reducedMotion()) {
      setShown(value);
      return;
    }
    // Al montarse espera su tarjeta; si despues cambia el dato (otro periodo), va de inmediato.
    const delay = mounted.current ? 0 : entranceDelay(el.current);
    mounted.current = true;
    from.current = current.current;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setShown(from.current + (value - from.current) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, el]);

  return shown;
}

/** Numero con formato propio (moneda, porcentaje, etc.) que cuenta hasta `value`. */
/** Dentro de un <text> de SVG pasa `svg` para que se dibuje como <tspan>. */
export function CountUp({ value, format, duration, svg }: { value: number; format: (n: number) => string; duration?: number; svg?: boolean }) {
  const ref = useRef<Element>(null);
  const shown = useCountUp(value, ref, duration);
  // Mientras cuenta, redondea como el valor final para que no salten decimales de mas.
  const decimals = Number.isInteger(value) ? 0 : 1;
  const rounded = Math.round(shown * 10 ** decimals) / 10 ** decimals;
  return svg ? <tspan ref={ref as RefObject<SVGTSpanElement>}>{format(rounded)}</tspan> : <span ref={ref as RefObject<HTMLSpanElement>}>{format(rounded)}</span>;
}

// Primer numero de un texto ya formateado en es-CL: "$ 1.234.567", "87,5 %", "12".
const NUMBER = /-?d{1,3}(?:.d{3})+(?:,d+)?|-?d+(?:,d+)?/;

/** Anima la cifra dentro de un texto ya formateado, conservando prefijo, sufijo y separadores. */
export function CountText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = text.match(NUMBER);
  const raw = match?.[0] ?? "";
  const decimals = raw.includes(",") ? raw.split(",")[1].length : 0;
  const grouped = /d.d{3}/.test(raw);
  const target = match ? Number(raw.replace(/./g, "").replace(",", ".")) : NaN;
  const shown = useCountUp(Number.isFinite(target) ? target : 0, ref);
  // Horas y fechas ("10:30", "12/05") no son cantidades: se muestran tal cual.
  if (!match || !Number.isFinite(target) || /[:/]/.test(text)) return <>{text}</>;
  // Mismo formato que el texto original: punto de miles solo si lo traia, coma decimal.
  const [int, frac] = Math.abs(shown).toFixed(decimals).split(".");
  const num = (shown < 0 ? "-" : "") + (grouped ? int.replace(/B(?=(d{3})+(?!d))/g, ".") : int) + (frac ? `,${frac}` : "");
  return <span ref={ref}>{text.slice(0, match.index) + num + text.slice((match.index ?? 0) + raw.length)}</span>;
}

/**
 * Pastilla turquesa que se desliza bajo la pestaña activa de un control segmentado.
 * Se mide a si misma contra el boton con aria-selected de su contenedor.
 */
export function SegPill({ active }: { active: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [measured, setBox] = useState<{ left: number; width: number } | null>(null);
  const box = useLiquidBox(measured, true);
  useEffect(() => {
    const list = ref.current?.parentElement;
    if (!list) return;
    const measure = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
      setBox(tab ? { left: tab.offsetLeft, width: tab.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={box ? "zs-seg-pill pointer-events-none absolute inset-y-[5px] rounded-full bg-[#50c9d5]" : "hidden"}
      style={box ?? undefined}
    />
  );
}

type Box = { top?: number; left: number; width: number; height?: number };

/**
 * Pildora "liquida" (como el menu de la referencia): al cambiar de opcion se estira primero hasta
 * cubrir la anterior y la nueva, y despues se recoge sobre la nueva. `stretch` en false la mueve
 * directo (por ejemplo al pasar el puntero).
 */
export function useLiquidBox<T extends Box>(target: T | null, stretch: boolean): T | null {
  const [shown, setShown] = useState<T | null>(target);
  const last = useRef<T | null>(target);
  useEffect(() => {
    const prev = last.current;
    last.current = target;
    if (!target || !prev || !stretch || reducedMotion()) {
      setShown(target);
      return;
    }
    const left = Math.min(prev.left, target.left);
    const right = Math.max(prev.left + prev.width, target.left + target.width);
    const union = { ...target, left, width: right - left } as T;
    if (target.top !== undefined && prev.top !== undefined) {
      const top = Math.min(prev.top, target.top);
      const bottom = Math.max(prev.top + (prev.height ?? 0), target.top + (target.height ?? 0));
      Object.assign(union, { top, height: bottom - top });
    }
    setShown(union);
    const t = window.setTimeout(() => setShown(target), 170);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.top, target?.left, target?.width, target?.height, stretch]);
  return shown;
}

/**
 * Titulo que entra letra por letra: cada letra sube desde abajo girando 6° (0,85 s, 22 ms entre
 * letras), como los titulos de la referencia Solvik. El texto completo queda para lectores de pantalla.
 */
export function SplitText({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const chars = ref.current?.querySelectorAll(".zs-ch");
    if (!chars?.length || reducedMotion()) return;
    const tween = gsap.fromTo(chars, { yPercent: 115, rotation: 6 }, { yPercent: 0, rotation: 0, duration: 0.85, ease: "power4.out", stagger: 0.022, delay, clearProps: "transform" });
    return () => {
      tween.kill();
    };
  }, [text, delay]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.split(/(\s+)/).map((word, i) =>
        /^\s+$/.test(word) ? (
          word
        ) : (
          <span key={i} className="zs-word" aria-hidden="true">
            {Array.from(word).map((ch, j) => (
              <span key={j} className="zs-ch">
                {ch}
              </span>
            ))}
          </span>
        )
      )}
    </span>
  );
}

/** Botones magneticos (.zs-magnetic): un solo listener para toda la app. Va una vez en el layout. */
export function MagneticButtons() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const movers = new WeakMap<Element, { x: (v: number) => void; y: (v: number) => void }>();
    let current: HTMLElement | null = null;
    const get = (el: HTMLElement) => {
      let m = movers.get(el);
      if (!m) movers.set(el, (m = { x: gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" }), y: gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" }) }));
      return m;
    };
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".zs-magnetic") ?? null;
      if (current && current !== el) {
        const m = get(current);
        m.x(0);
        m.y(0);
      }
      current = el;
      if (!el || reducedMotion()) return;
      const r = el.getBoundingClientRect();
      const m = get(el);
      m.x((e.clientX - r.left - r.width / 2) * 0.24);
      m.y((e.clientY - r.top - r.height / 2) * 0.3);
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, []);
  return null;
}
