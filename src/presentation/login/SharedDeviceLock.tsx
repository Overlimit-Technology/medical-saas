"use client";

import { useState } from "react";
import { Lock, UserPlus } from "lucide-react";
import { CredentialsForm } from "@/presentation/common/SharedSessionSwitcher";

export type LockedProfile = { userId: string; name: string; role: string };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", DOCTOR: "Profesional", SECRETARY: "Secretaria" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || json.ok === false) throw new Error(json.error ?? "No se pudo ingresar.");
}

/** Pantalla de bloqueo del equipo compartido: todo ingreso aqui exige contrasena. */
export default function SharedDeviceLock({
  profiles,
  onUseNormalLogin,
}: {
  profiles: LockedProfile[];
  onUseNormalLogin: () => void;
}) {
  const [selected, setSelected] = useState<LockedProfile | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
      setBusy(false);
    }
  };

  const leaveSharedMode = async () => {
    if (!window.confirm("Este equipo dejara de ser compartido y se olvidaran los perfiles guardados. Continuar?")) return;
    await fetch("/api/auth/device", { method: "DELETE", credentials: "include" });
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700">
        <Lock className="h-4 w-4 text-[#1e737b]" />
        <h2 className="text-sm font-semibold">Equipo compartido bloqueado</h2>
      </div>
      <p className="text-sm text-slate-500">Elige tu perfil e ingresa tu contrasena para continuar.</p>

      {selected === null ? (
        <ul className="space-y-2">
          {profiles.map((profile) => (
            <li key={profile.userId}>
              <button
                type="button"
                onClick={() => { setError(null); setSelected(profile); }}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-[#50c9d5]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#50c9d5] text-sm font-semibold text-[#080b04]">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{profile.name}</span>
                  <span className="block text-xs text-slate-500">{ROLE_LABEL[profile.role] ?? profile.role}</span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => { setError(null); setSelected("new"); }}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-left text-sm text-slate-600 hover:border-[#50c9d5]"
            >
              <UserPlus className="h-4 w-4" /> Agregar otro profesional
            </button>
          </li>
        </ul>
      ) : selected === "new" ? (
        <CredentialsForm
          askEmail
          busy={busy}
          error={error}
          submitLabel="Ingresar"
          onSubmit={(email, password) => void submit(() => post("/api/auth/device/add", { email, password }))}
        />
      ) : (
        <CredentialsForm
          busy={busy}
          error={error}
          submitLabel={`Ingresar como ${selected.name}`}
          onSubmit={(_email, password) => void submit(() => post("/api/auth/switch", { userId: selected.userId, password }))}
        />
      )}

      {selected !== null && (
        <button type="button" onClick={() => setSelected(null)} className="text-xs text-slate-500 underline">
          Volver a la lista
        </button>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <button type="button" onClick={onUseNormalLogin} className="underline">Inicio de sesion normal</button>
        <button type="button" onClick={() => void leaveSharedMode()} className="underline">Quitar modo compartido de este equipo</button>
      </div>
    </div>
  );
}
