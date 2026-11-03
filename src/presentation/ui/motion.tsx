"use client";

/**
 * Cifras que cuentan hasta su valor, como en la entrada del panel: el numero sube desde cero
 * al montarse y, si el dato cambia (otro periodo), pasa del valor anterior al nuevo.
 * Con "menos movimiento" se muestra el valor final de inmediato.
 */
import { useEffect, useRef, useState, type RefObject } from "react";

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
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
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
