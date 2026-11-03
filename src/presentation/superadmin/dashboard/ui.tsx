"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, X } from "lucide-react";

export const inputClass =
  "w-full rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(13,27,42,.06)] outline-none transition duration-200 focus:border-[#0e88ab] focus:bg-white focus:ring-[3px] focus:ring-[#50c9d5]/25 disabled:bg-white/40";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#0e88ab] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b7897] disabled:cursor-not-allowed disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition duration-200 hover:bg-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="zs-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-[#0d1b2a]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`zs-glass-strong zs-modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] sm:rounded-[28px] ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}>
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// Confirmacion de una accion sobre una sede. onConfirm lanza Error para mostrar el mensaje dentro del dialogo.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la accion.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={busy ? () => undefined : onClose}>
      <div className="space-y-3 text-sm text-slate-600">
        <div>{message}</div>
        {children}
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
            {error}
          </p>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className={danger ? btnDanger : btnPrimary} onClick={run} disabled={busy}>
          {busy ? "Aplicando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export type MenuItem = { label: string; onClick: () => void; danger?: boolean; hidden?: boolean };

// Menu de acciones por fila. Se posiciona con "fixed" para que no lo recorte el scroll horizontal de la tabla,
// y se cierra al hacer clic fuera, con Escape o al desplazar la pagina.
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPos(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const hide = () => setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="inline-block text-left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          const right = window.innerWidth - r.right;
          // Si abajo no cabe, el menu se abre hacia arriba.
          const needed = visible.length * 38 + 12;
          setPos(window.innerHeight - r.bottom < needed ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
        }}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/70"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {pos && (
        <div role="menu" style={{ position: "fixed", ...pos }} className="zs-glass-strong zs-menu-in z-50 w-56 rounded-2xl p-1">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setPos(null);
                item.onClick();
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-white/70 ${item.danger ? "text-rose-600" : "text-slate-700"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
