"use client";

/**
 * Candado de la ficha clinica para computadores compartidos.
 *
 * - Antes de mostrar la ficha pide el PIN del profesional (o que lo cree con su contrasena).
 * - Tras 2 minutos sin tocar el teclado ni el mouse se bloquea sola: la ficha queda montada debajo,
 *   borrosa e inerte, asi nada de lo escrito se pierde y al volver basta el PIN.
 * - Si el servidor responde 423 (el plazo vencio en otra pestana) tambien se bloquea.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Delete, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { CLINICAL_LOCKED_EVENT } from "@/data/consultations/ConsultationsRepository";
import { gsap, popIn, reduced } from "@/presentation/ui/fx";

export const CLINICAL_UNLOCKED_EVENT = "zensya:clinical-unlocked";

type Status = { hasPin: boolean; unlocked: boolean; blocked: boolean; idleSeconds: number };
type Mode = "loading" | "open" | "pin" | "setup";

const LockContext = createContext<{ lock: () => void }>({ lock: () => {} });
export const useClinicalLock = () => useContext(LockContext);

const WARN_SECONDS = 15;

async function api(method: "GET" | "POST" | "DELETE", body?: unknown) {
  const res = await fetch("/api/clinical/pin", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: Status; error?: string; code?: string } | null;
  return { ok: res.ok && Boolean(data?.ok), status: res.status, item: data?.item, error: data?.error, code: data?.code };
}

export default function ClinicalLock({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [mounted, setMounted] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(120);
  const [blockedNotice, setBlockedNotice] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const lastActivity = useRef(Date.now());

  const applyStatus = useCallback((status: Status) => {
    setIdleSeconds(status.idleSeconds);
    setBlockedNotice(status.blocked);
    if (status.unlocked) {
      lastActivity.current = Date.now();
      setMode("open");
      setMounted(true);
    } else setMode(!status.hasPin || status.blocked ? "setup" : "pin");
  }, []);

  useEffect(() => {
    void api("GET").then((r) => {
      if (r.item) applyStatus(r.item);
      else setMode("pin");
    });
  }, [applyStatus]);

  const lock = useCallback(() => {
    setMode((current) => (current === "open" ? "pin" : current));
    void api("DELETE");
  }, []);

  // Bloqueo por inactividad.
  useEffect(() => {
    if (mode !== "open") return;
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "input"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const remaining = Math.ceil(idleSeconds - (Date.now() - lastActivity.current) / 1000);
      setLeft(remaining <= WARN_SECONDS ? Math.max(remaining, 0) : null);
      if (remaining <= 0) lock();
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
      setLeft(null);
    };
  }, [mode, idleSeconds, lock]);

  // El servidor dijo 423.
  useEffect(() => {
    const onLocked = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      setBlockedNotice(code === "PIN_BLOCKED");
      setMode(code === "PIN_SETUP" || code === "PIN_BLOCKED" ? "setup" : "pin");
    };
    window.addEventListener(CLINICAL_LOCKED_EVENT, onLocked);
    return () => window.removeEventListener(CLINICAL_LOCKED_EVENT, onLocked);
  }, []);

  const onUnlocked = useCallback(
    (status: Status) => {
      applyStatus(status);
      window.dispatchEvent(new CustomEvent(CLINICAL_UNLOCKED_EVENT));
    },
    [applyStatus]
  );

  if (mode === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  const locked = mode !== "open";

  return (
    <LockContext.Provider value={{ lock }}>
      {mounted && (
        <div aria-hidden={locked} {...(locked ? ({ inert: "" } as Record<string, string>) : {})} className={locked ? "pointer-events-none select-none blur-md transition-[filter] duration-300" : "transition-[filter] duration-300"}>
          {children}
        </div>
      )}

      {left !== null && !locked && (
        <button
          type="button"
          onClick={() => (lastActivity.current = Date.now())}
          className="animate-fade-in fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl"
        >
          <Lock size={13} /> La ficha se bloquea en {left} s · Seguir aqui
        </button>
      )}

      {locked && (
        <div className={`${mounted ? "fixed inset-0 z-[80] bg-slate-900/30" : "relative min-h-[70vh]"} flex items-center justify-center px-4`}>
          {mode === "pin" ? (
            <PinPad onUnlocked={onUnlocked} onNeedSetup={(blocked) => { setBlockedNotice(blocked); setMode("setup"); }} />
          ) : (
            <PinSetup blocked={blockedNotice} onDone={onUnlocked} />
          )}
        </div>
      )}
    </LockContext.Provider>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => popIn(ref.current, { from: 0.92 }), []);
  return (
    <div ref={ref} role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-2xl shadow-slate-900/15">
      {children}
    </div>
  );
}

function PinPad({ onUnlocked, onNeedSetup }: { onUnlocked: (s: Status) => void; onNeedSetup: (blocked: boolean) => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < 4 || busy) return;
      setBusy(true);
      setError(null);
      const r = await api("POST", { action: "unlock", pin: value });
      setBusy(false);
      if (r.ok && r.item) return onUnlocked(r.item);
      if (r.code === "PIN_BLOCKED" || r.code === "PIN_SETUP") return onNeedSetup(r.code === "PIN_BLOCKED");
      setPin("");
      setError(r.error ?? "PIN incorrecto.");
      if (dotsRef.current && !reduced()) gsap.fromTo(dotsRef.current, { x: 0 }, { keyframes: { x: [-10, 10, -7, 7, -3, 0] }, duration: 0.45, ease: "power2.out" });
    },
    [busy, onNeedSetup, onUnlocked]
  );

  const press = useCallback(
    (digit: string) => {
      setError(null);
      setPin((current) => {
        if (current.length >= 6) return current;
        const next = current + digit;
        if (next.length === 6) void submit(next);
        return next;
      });
    },
    [submit]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((c) => c.slice(0, -1));
      else if (e.key === "Enter") void submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, press, submit]);

  return (
    <Card>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#50c9d5]/12 text-[#1e737b]">
        <Lock size={20} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Ficha bloqueada</h2>
      <p className="mt-1 text-sm text-slate-500">Ingresa tu PIN para seguir atendiendo.</p>

      <div ref={dotsRef} className="mt-6 flex justify-center gap-2.5" aria-label={`${pin.length} digitos ingresados`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition-all duration-200 ${i < pin.length ? "scale-110 bg-[#50c9d5]" : i < 4 ? "bg-slate-200" : "bg-slate-100"}`}
          />
        ))}
      </div>
      <p className={`mt-3 min-h-[1.25rem] text-xs ${error ? "text-rose-600" : "text-slate-400"}`}>{error ?? "4 a 6 numeros"}</p>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PadKey key={d} onClick={() => press(d)}>{d}</PadKey>
        ))}
        <PadKey onClick={() => setPin((c) => c.slice(0, -1))} label="Borrar">
          <Delete size={18} />
        </PadKey>
        <PadKey onClick={() => press("0")}>0</PadKey>
        <button
          type="button"
          onClick={() => void submit(pin)}
          disabled={pin.length < 4 || busy}
          className="flex h-14 items-center justify-center rounded-2xl bg-[#50c9d5] text-sm font-semibold text-[#080b04] transition-all hover:bg-[#45bcc8] disabled:bg-slate-100 disabled:text-slate-400"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
        </button>
      </div>

      <button type="button" onClick={() => onNeedSetup(false)} className="mt-5 text-xs font-medium text-slate-400 underline-offset-2 hover:text-[#1e737b] hover:underline">
        Olvide mi PIN
      </button>
    </Card>
  );
}

function PadKey({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 items-center justify-center rounded-2xl bg-slate-50 text-lg font-semibold tabular-nums text-slate-800 transition-all duration-150 hover:bg-slate-100 active:scale-95"
    >
      {children}
    </button>
  );
}

function PinSetup({ blocked, onDone }: { blocked: boolean; onDone: (s: Status) => void }) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pin !== confirm) return setError("Los PIN no coinciden.");
    setBusy(true);
    setError(null);
    const r = await api("POST", { action: "set", password, pin });
    setBusy(false);
    if (r.ok && r.item) return onDone(r.item);
    setError(r.error ?? "No se pudo guardar el PIN.");
  };

  const input = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#50c9d5] focus:outline-none focus:ring-2 focus:ring-[#50c9d5]/15";
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  return (
    <Card>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#50c9d5]/12 text-[#1e737b]">
        {blocked ? <KeyRound size={20} /> : <ShieldCheck size={20} />}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{blocked ? "PIN bloqueado" : "Crea tu PIN clinico"}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {blocked
          ? "Hubo demasiados intentos. Confirma tu contrasena y elige un PIN nuevo."
          : "Lo pediremos al abrir fichas y cuando el equipo quede sin uso por 2 minutos."}
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3 text-left">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tu contrasena</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">PIN nuevo</span>
            <input inputMode="numeric" autoComplete="off" type="password" required minLength={4} value={pin} onChange={(e) => setPin(digits(e.target.value))} className={`${input} tracking-[0.4em]`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Repitelo</span>
            <input inputMode="numeric" autoComplete="off" type="password" required minLength={4} value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className={`${input} tracking-[0.4em]`} />
          </label>
        </div>
        <p className="text-xs text-slate-400">4 a 6 numeros, sin repetidos ni correlativos (1234, 0000).</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#50c9d5] px-5 py-3 text-sm font-semibold text-[#080b04] transition-all hover:bg-[#45bcc8] disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />} Guardar PIN y abrir la ficha
        </button>
      </form>
    </Card>
  );
}
