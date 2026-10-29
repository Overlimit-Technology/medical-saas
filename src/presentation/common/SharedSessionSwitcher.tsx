"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, LogOut, ShieldAlert, UserPlus, UsersRound, X } from "lucide-react";
import { SHARED_RISK_POINTS, SHARED_RISK_TITLE } from "./sharedSessionCopy";

type DeviceProfile = {
  userId: string;
  name: string;
  role: string;
  active: boolean;
  requiresPassword: boolean;
};

type DeviceInfo = {
  available: boolean;
  active: boolean;
  idleMinutes: number;
  profiles: DeviceProfile[];
};

type ModalState =
  | { kind: "activate" }
  | { kind: "add" }
  | { kind: "password"; profile: DeviceProfile }
  | null;

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", DOCTOR: "Profesional", SECRETARY: "Secretaria" };
const ACTIVITY_KEY = "mg_last_activity";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || json.ok === false) throw new Error(json.error ?? "No se pudo completar la accion.");
  return json;
}

/** Recarga completa: reinicia el estado del cliente para no filtrar datos entre perfiles. */
function reloadApp() {
  window.location.assign("/");
}

function useIdleLock(enabled: boolean, idleMinutes: number) {
  useEffect(() => {
    if (!enabled) return;
    const touch = () => {
      try {
        window.localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      } catch {
        // sin almacenamiento: se usa solo el valor en memoria
      }
      memory.current = Date.now();
    };
    const memory = { current: Date.now() };
    touch();
    let lastWrite = Date.now();
    const onActivity = () => {
      if (Date.now() - lastWrite > 5000) {
        lastWrite = Date.now();
        touch();
      }
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      let last = memory.current;
      try {
        last = Math.max(last, Number(window.localStorage.getItem(ACTIVITY_KEY)) || 0);
      } catch {
        // ignorar
      }
      if (Date.now() - last >= idleMinutes * 60_000) {
        window.clearInterval(timer);
        void post("/api/auth/device/lock?reason=idle")
          .catch(() => undefined)
          .finally(reloadApp);
      }
    }, 10_000);

    return () => {
      events.forEach((name) => window.removeEventListener(name, onActivity));
      window.clearInterval(timer);
    };
  }, [enabled, idleMinutes]);
}

export default function SharedSessionSwitcher({ collapsed }: { collapsed: boolean }) {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/device", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setInfo(json as DeviceInfo);
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useIdleLock(info?.active === true, info?.idleMinutes ?? 10);

  if (!info || (!info.available && !info.active)) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reloadApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la accion.");
      setBusy(false);
    }
  };

  const switchTo = (profile: DeviceProfile) => {
    if (profile.active) return;
    if (profile.requiresPassword) {
      setError(null);
      setModal({ kind: "password", profile });
      return;
    }
    void run(() => post("/api/auth/switch", { userId: profile.userId })).then(() => undefined);
    // Si el servidor exige contrasena (ventana vencida), se pide en el modal.
  };

  const baseBtn =
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium leading-4 text-white/90 transition-colors hover:bg-white/10 hover:text-white";

  const current = info.profiles.find((p) => p.active);

  return (
    <div ref={rootRef} className="relative">
      {!info.active ? (
        <button type="button" onClick={() => { setError(null); setModal({ kind: "activate" }); }} className={`${baseBtn} ${collapsed ? "justify-center px-0" : ""}`} title="Compartir este equipo">
          <UsersRound className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
          {!collapsed && <span className="flex-1">Compartir este equipo</span>}
        </button>
      ) : (
        <>
          <button type="button" onClick={() => setOpen((v) => !v)} className={`${baseBtn} ${collapsed ? "justify-center px-0" : ""}`} title="Cambiar de usuario" aria-haspopup="menu" aria-expanded={open}>
            <UsersRound className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block">Cambiar de usuario</span>
                <span className="block truncate text-[10px] text-white/70">{current?.name}</span>
              </span>
            )}
          </button>

          {open && (
            <div role="menu" className="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl">
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Perfiles en este equipo</p>
              <ul className="space-y-0.5">
                {info.profiles.map((profile) => (
                  <li key={profile.userId}>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => switchTo(profile)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${profile.active ? "bg-[#19b3bc]/10 text-[#0f8f98]" : "hover:bg-slate-50"}`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#19b3bc] text-[11px] font-semibold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{profile.name}</span>
                        <span className="block text-[11px] text-slate-500">
                          {ROLE_LABEL[profile.role] ?? profile.role}
                          {profile.active ? " - activo" : profile.requiresPassword ? " - pide contrasena" : ""}
                        </span>
                      </span>
                      {!profile.active && profile.requiresPassword && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="my-2 border-t border-slate-100" />
              <MenuButton icon={UserPlus} onClick={() => { setOpen(false); setError(null); setModal({ kind: "add" }); }}>Agregar otro profesional</MenuButton>
              <MenuButton icon={Lock} onClick={() => void run(() => post("/api/auth/device/lock"))}>Bloquear pantalla</MenuButton>
              <form action="/api/auth/logout" method="post">
                <MenuButton icon={LogOut} submit>Cerrar mi sesion</MenuButton>
              </form>
              <form action="/api/auth/logout" method="post">
                <input type="hidden" name="scope" value="all" />
                <MenuButton icon={LogOut} submit>Cerrar todas las sesiones</MenuButton>
              </form>
              <MenuButton
                icon={ShieldAlert}
                onClick={() => {
                  if (window.confirm("Se cerraran las sesiones de los demas perfiles de este equipo y se desactivara el modo compartido. Tu sesion sigue abierta. Continuar?")) {
                    void run(() => fetch("/api/auth/device", { method: "DELETE", credentials: "include" }));
                  }
                }}
              >
                Desactivar modo compartido
              </MenuButton>
              {error && <p className="px-2 pt-1 text-xs text-rose-600">{error}</p>}
            </div>
          )}
        </>
      )}

      {modal?.kind === "activate" && (
        <Modal title={SHARED_RISK_TITLE} onClose={() => setModal(null)}>
          <ActivateForm
            busy={busy}
            error={error}
            onSubmit={(password) => run(() => post("/api/auth/device", { password, accept: true }))}
          />
        </Modal>
      )}
      {modal?.kind === "add" && (
        <Modal title="Agregar otro profesional" onClose={() => setModal(null)}>
          <CredentialsForm
            askEmail
            busy={busy}
            error={error}
            submitLabel="Agregar y cambiar"
            description="El profesional inicia sesion con su correo y contrasena. Tu sesion queda guardada en este equipo."
            onSubmit={(email, password) => run(() => post("/api/auth/device/add", { email, password }))}
          />
        </Modal>
      )}
      {modal?.kind === "password" && (
        <Modal title={`Ingresar como ${modal.profile.name}`} onClose={() => setModal(null)}>
          <CredentialsForm
            busy={busy}
            error={error}
            submitLabel="Cambiar de usuario"
            description="Por seguridad debes ingresar tu contrasena para volver a tu sesion."
            onSubmit={(_email, password) => run(() => post("/api/auth/switch", { userId: modal.profile.userId, password }))}
          />
        </Modal>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  children,
  onClick,
  submit,
}: {
  icon: typeof Lock;
  children: React.ReactNode;
  onClick?: () => void;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#19b3bc]";
const primaryClass = "h-10 w-full rounded-xl bg-[#19b3bc] text-sm font-semibold text-white hover:bg-[#159ea7] disabled:opacity-50";

function ActivateForm({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit: (password: string) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [password, setPassword] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (accepted && password) onSubmit(password);
      }}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <p className="mb-1 flex items-center gap-1.5 font-semibold"><ShieldAlert className="h-4 w-4" />Aviso de riesgos</p>
        <ul className="list-disc space-y-1 pl-4">
          {SHARED_RISK_POINTS.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0f9ea8]" />
        Entiendo los riesgos y los acepto.
      </label>
      <label className="block text-xs font-medium text-slate-500">
        Reingresa tu contrasena para confirmar
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || !accepted || !password} className={primaryClass}>
        {busy ? "Activando..." : "Activar en este equipo"}
      </button>
    </form>
  );
}

export function CredentialsForm({
  askEmail,
  busy,
  error,
  submitLabel,
  description,
  onSubmit,
}: {
  askEmail?: boolean;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  description?: string;
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(email, password);
      }}
    >
      {description && <p className="text-sm text-slate-500">{description}</p>}
      {askEmail && (
        <label className="block text-xs font-medium text-slate-500">
          Correo electronico
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
      )}
      <label className="block text-xs font-medium text-slate-500">
        Contrasena
        <input type="password" autoComplete="current-password" autoFocus={!askEmail} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || !password || (askEmail && !email)} className={primaryClass}>
        {busy ? "Verificando..." : submitLabel}
      </button>
    </form>
  );
}
