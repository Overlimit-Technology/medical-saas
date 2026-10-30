"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";
import { usePortalTarget, usePresence } from "./usePortalTarget";

export type DialogTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};
export type AlertOptions = {
  title: string;
  message?: React.ReactNode;
  okLabel?: string;
  tone?: "info" | "success" | "error";
};
export type PromptOptions = {
  title: string;
  message?: React.ReactNode;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  /** Devuelve un mensaje de error o null si el valor es valido. */
  validate?: (value: string) => string | null;
};
export type ToastOptions = { message: string; tone?: "success" | "error" | "info"; durationMs?: number };

type DialogItem =
  | { id: number; kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { id: number; kind: "alert"; opts: AlertOptions; resolve: () => void }
  | { id: number; kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

type ToastItem = ToastOptions & { id: number };

type Api = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
  toast: (opts: ToastOptions | string) => void;
};

const DialogContext = createContext<Api | null>(null);

function useApi(): Api {
  const api = useContext(DialogContext);
  if (!api) throw new Error("Falta <DialogProvider> en el arbol de la app.");
  return api;
}

/** `const confirm = useConfirm(); if (await confirm({ title: "...", tone: "danger" })) ...` */
export const useConfirm = () => useApi().confirm;
/** `const alert = useAlert(); await alert({ title: "Listo", message: "...", tone: "success" })` */
export const useAlert = () => useApi().alert;
/** `const prompt = usePrompt(); const text = await prompt({ title: "..." })` (null si se cancela) */
export const usePrompt = () => useApi().prompt;
/** `const toast = useToast(); toast({ message: "Guardado", tone: "success" })` */
export const useToast = () => useApi().toast;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<DialogItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const target = usePortalTarget();

  const remove = useCallback((id: number) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const api = useMemo<Api>(() => {
    const push = (make: (id: number) => DialogItem) => setItems((prev) => [...prev, make(++seq.current)]);
    return {
      confirm: (opts) => new Promise<boolean>((resolve) => push((id) => ({ id, kind: "confirm", opts, resolve }))),
      alert: (opts) => new Promise<void>((resolve) => push((id) => ({ id, kind: "alert", opts, resolve }))),
      prompt: (opts) => new Promise<string | null>((resolve) => push((id) => ({ id, kind: "prompt", opts, resolve }))),
      toast: (opts) => {
        const o = typeof opts === "string" ? { message: opts } : opts;
        setToasts((prev) => [...prev.slice(-3), { ...o, id: ++seq.current }]);
      },
    };
  }, []);

  const top = items[items.length - 1];

  return (
    <DialogContext.Provider value={api}>
      {children}
      {target &&
        createPortal(
          <>
            {items.map((item) => (
              <DialogView key={item.id} item={item} isTop={item === top} onDone={remove} />
            ))}
            <ToastViewport toasts={toasts} onDismiss={dismissToast} />
          </>,
          target,
        )}
    </DialogContext.Provider>
  );
}

const TONE_ICON = {
  info: { Icon: Info, wrap: "bg-[#19b3bc]/10 text-[#0f8f98]" },
  success: { Icon: CheckCircle2, wrap: "bg-emerald-50 text-emerald-600" },
  error: { Icon: XCircle, wrap: "bg-rose-50 text-rose-600" },
  danger: { Icon: AlertTriangle, wrap: "bg-rose-50 text-rose-600" },
  default: { Icon: Info, wrap: "bg-[#19b3bc]/10 text-[#0f8f98]" },
} as const;

function DialogView({ item, isTop, onDone }: { item: DialogItem; isTop: boolean; onDone: (id: number) => void }) {
  const [open, setOpen] = useState(true);
  const { mounted, visible } = usePresence(open, 180);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const settled = useRef(false);
  const [value, setValue] = useState(item.kind === "prompt" ? item.opts.defaultValue ?? "" : "");
  const [error, setError] = useState<string | null>(null);

  const danger = item.kind === "confirm" && item.opts.tone === "danger";
  const tone: keyof typeof TONE_ICON =
    item.kind === "alert" ? item.opts.tone ?? "info" : item.kind === "confirm" ? item.opts.tone ?? "default" : "default";

  /** Resuelve la promesa al instante (sin esperar la animacion) y arranca la salida. */
  const settle = useCallback(
    (accepted: boolean, text?: string) => {
      if (settled.current) return;
      settled.current = true;
      if (item.kind === "confirm") item.resolve(accepted);
      else if (item.kind === "prompt") item.resolve(accepted ? text ?? "" : null);
      else item.resolve();
      setOpen(false);
    },
    [item],
  );

  useEffect(() => {
    if (!open && !mounted) onDone(item.id);
  }, [open, mounted, onDone, item.id]);

  const initial = item.kind === "prompt" ? inputRef : danger ? cancelRef : okRef;
  useFocusTrap(panelRef, mounted && open && isTop, initial as React.RefObject<HTMLElement>);

  useEffect(() => {
    if (!open || !isTop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        settle(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, isTop, settle]);

  // Bloquea el scroll del fondo mientras haya un dialogo abierto.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;
  const { Icon, wrap } = TONE_ICON[tone];
  const opts = item.opts as { title: string; message?: React.ReactNode };

  const accept = () => {
    if (item.kind === "prompt") {
      const message = item.opts.validate?.(value) ?? null;
      if (message) return setError(message);
      return settle(true, value);
    }
    settle(true);
  };

  const confirmClass = danger
    ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300"
    : "bg-[#19b3bc] hover:bg-[#159ea7] focus-visible:ring-[#19b3bc]/40";
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/15";

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-end justify-center p-4 transition-opacity duration-200 motion-reduce:transition-none sm:items-center ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onMouseDown={item.kind === "alert" ? () => settle(false) : undefined} aria-hidden="true" />
      <div
        ref={panelRef}
        role={item.kind === "alert" || danger ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={opts.message ? descId : undefined}
        tabIndex={-1}
        className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl outline-none transition duration-200 ease-out motion-reduce:transition-none ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"}`}
      >
        <button type="button" onClick={() => settle(false)} aria-label="Cerrar" className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3.5">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${wrap}`}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 pr-5">
            <h2 id={titleId} className="text-base font-semibold leading-6 text-slate-900">{opts.title}</h2>
            {opts.message ? (
              <div id={descId} className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-500">{opts.message}</div>
            ) : null}
          </div>
        </div>

        {item.kind === "prompt" && (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              accept();
            }}
          >
            {item.opts.label && <label className="mb-1 block text-xs font-medium text-slate-500">{item.opts.label}</label>}
            {item.opts.multiline ? (
              <textarea
                ref={inputRef}
                rows={4}
                value={value}
                placeholder={item.opts.placeholder}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                className={`${inputClass} py-2`}
              />
            ) : (
              <input
                ref={inputRef}
                value={value}
                placeholder={item.opts.placeholder}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                className={`${inputClass} h-10`}
              />
            )}
            {error && <p role="alert" className="mt-1.5 text-xs text-rose-600">{error}</p>}
          </form>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {item.kind !== "alert" && (
            <button
              ref={cancelRef}
              type="button"
              onClick={() => settle(false)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {item.opts.cancelLabel ?? "Cancelar"}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={accept}
            className={`h-10 rounded-xl px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 ${confirmClass}`}
          >
            {item.kind === "alert" ? item.opts.okLabel ?? "Entendido" : item.opts.confirmLabel ?? (danger ? "Eliminar" : "Aceptar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[10001] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [open, setOpen] = useState(true);
  const { mounted, visible } = usePresence(open, 180);
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), toast.durationMs ?? 4500);
    return () => window.clearTimeout(t);
  }, [toast.durationMs]);
  useEffect(() => {
    if (!open && !mounted) onDismiss(toast.id);
  }, [open, mounted, onDismiss, toast.id]);
  if (!mounted) return null;
  const tone = toast.tone ?? "info";
  const { Icon, wrap } = TONE_ICON[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 pr-2 text-sm text-slate-700 shadow-xl transition duration-200 motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${wrap}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 flex-1 py-0.5 leading-5">{toast.message}</p>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar aviso" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
