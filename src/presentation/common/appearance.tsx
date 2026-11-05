"use client";

/**
 * Apariencia de la app del equipo: "Liquido" (liquid glass claro sobre fondo blanco, por defecto) o
 * "Clasico" (el diseño de vidrio anterior). Se recuerda en este navegador (localStorage).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Droplets, Layers, Palette, X } from "lucide-react";
import { createPortal } from "react-dom";

export type Theme = "liquido" | "clasico";
type Appearance = { theme: Theme };

const KEY = "zs-apariencia";
const DEFAULT: Appearance = { theme: "liquido" };
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

let current: Appearance = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved?.theme === "clasico" || saved?.theme === "liquido") current = { theme: saved.theme };
  } catch {}
}

function set(patch: Partial<Appearance>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  listeners.forEach((l) => l());
}

export function useAppearance() {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (load(), current),
    () => DEFAULT
  );
  return [value, set] as const;
}

/**
 * Aplica el tema en <html> (asi lo heredan tambien los modales y menus que van en el body) y dibuja
 * el fondo blanco del tema Liquido.
 */
export function SceneBackground() {
  const [{ theme }] = useAppearance();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("zs-liquid", theme === "liquido");
    return () => root.classList.remove("zs-liquid");
  }, [theme]);
  return theme === "liquido" ? <div aria-hidden="true" className="zs-scene" /> : null;
}

/** Boton del menu lateral que abre el selector de estilo. */
export function AppearanceButton({ rail, className, onHover, onLeave }: { rail: boolean; className: string; onHover?: (e: React.MouseEvent<HTMLElement>) => void; onLeave?: () => void }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; bottom: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [value, update] = useAppearance();

  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (r) setBox({ left: r.right + 12, bottom: window.innerHeight - r.bottom });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen((v) => !v)} onMouseEnter={onHover} onMouseLeave={onLeave} className={className} aria-label="Apariencia" aria-expanded={open}>
        <span className="grid h-8 w-8 shrink-0 place-items-center">
          <Palette className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        {!rail && <span className="zs-label-in min-w-0 flex-1 text-left">Apariencia</span>}
      </button>
      {open && box && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[75]" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                role="dialog"
                aria-label="Apariencia"
                className="zs-glass-strong zs-menu-in fixed z-[76] w-[280px] rounded-[24px] p-4 max-lg:!left-3"
                style={{ left: Math.min(box.left, window.innerWidth - 292), bottom: Math.max(12, box.bottom) }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <b className="font-display text-[15px] font-bold text-slate-900">Apariencia</b>
                  <button type="button" onClick={() => setOpen(false)} className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2" role="radiogroup" aria-label="Estilo">
                  {(
                    [
                      ["liquido", "Líquido", "Vidrio claro sobre fondo blanco", Droplets],
                      ["clasico", "Clásico", "El vidrio anterior", Layers],
                    ] as const
                  ).map(([id, label, hint, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={value.theme === id}
                      onClick={() => update({ theme: id })}
                      className={cx(
                        "zs-press flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        value.theme === id ? "border-[#50c9d5] bg-[#50c9d5]/15" : "border-slate-200 hover:border-[#50c9d5]"
                      )}
                    >
                      <span className={cx("grid h-9 w-9 place-items-center rounded-xl", value.theme === id ? "bg-[#50c9d5] text-[#080b04]" : "bg-slate-100 text-slate-600")}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[13.5px] font-semibold text-slate-900">{label}</b>
                        <span className="block text-[12px] text-slate-500">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
