"use client";

/**
 * Aviso flotante abajo al centro, con "Deshacer" opcional (como el de la referencia Solvik):
 * entra subiendo con rebote, dura 2,6 s (5 s si se puede deshacer) y sale bajando.
 * Uso: toast("Lead movido a Ganado", { undo: () => ..., icon: "trophy" }).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Trash2, Trophy, Undo2, X } from "lucide-react";
import { d, gsap } from "./fx";

type ToastIcon = "check" | "trophy" | "trash" | "close";
type ToastMsg = { id: number; text: string; icon: ToastIcon; undo?: () => void };

let push: ((m: ToastMsg) => void) | null = null;
let seq = 0;

export function toast(text: string, opts: { undo?: () => void; icon?: ToastIcon } = {}) {
  push?.({ id: ++seq, text, icon: opts.icon ?? "check", undo: opts.undo });
}

const ICONS = { check: Check, trophy: Trophy, trash: Trash2, close: X };

/** Va una sola vez en el layout de la app. */
export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    push = setMsg;
    return () => {
      push = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !msg) return;
    tl.current?.kill();
    tl.current = gsap
      .timeline()
      .fromTo(el, { opacity: 0, y: 18, scale: 0.96, visibility: "visible" }, { opacity: 1, y: 0, scale: 1, duration: d(0.45), ease: "back.out(1.8)" })
      .to(el, { opacity: 0, y: 10, duration: d(0.3), ease: "power2.in", onComplete: () => setMsg(null) }, msg.undo ? "+=5" : "+=2.6");
  }, [msg]);

  const undo = () => {
    const m = msg;
    tl.current?.kill();
    if (ref.current) gsap.to(ref.current, { opacity: 0, y: 10, duration: d(0.25), onComplete: () => setMsg(null) });
    m?.undo?.();
  };

  if (typeof document === "undefined" || !msg) return null;
  const Icon = ICONS[msg.icon];
  return createPortal(
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="zs-glass-strong invisible fixed bottom-6 left-1/2 z-[95] flex items-center gap-3 rounded-full py-2 pl-2 pr-2.5 text-[13.5px] text-slate-900"
      style={{ translate: "-50% 0" }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#50c9d5] text-[#080b04]">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="font-medium">{msg.text}</span>
      {msg.undo ? (
        <button type="button" onClick={undo} className="zs-press inline-flex items-center gap-1.5 rounded-full bg-[#0d1b2a] px-3 py-1.5 text-[12.5px] font-semibold text-white">
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Deshacer
        </button>
      ) : null}
    </div>,
    document.body
  );
}
