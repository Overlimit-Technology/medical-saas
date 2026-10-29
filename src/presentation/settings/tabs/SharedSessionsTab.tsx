"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { SHARED_ADMIN_WARNING } from "@/presentation/common/sharedSessionCopy";

type SharedConfig = { enabled: boolean; idleMinutes: number; maxHours: number };

export default function SharedSessionsTab() {
  const [config, setConfig] = useState<SharedConfig | null>(null);
  const [draft, setDraft] = useState<{ idleMinutes: number; maxHours: number }>({ idleMinutes: 10, maxHours: 8 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const apply = (json: SharedConfig) => {
    setConfig({ enabled: json.enabled, idleMinutes: json.idleMinutes, maxHours: json.maxHours });
    setDraft({ idleMinutes: json.idleMinutes, maxHours: json.maxHours });
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic-settings/shared-sessions", { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setConfig({ enabled: json.enabled, idleMinutes: json.idleMinutes, maxHours: json.maxHours });
      setDraft({ idleMinutes: json.idleMinutes, maxHours: json.maxHours });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/clinic-settings/shared-sessions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo guardar.");
      apply(json);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (enabled: boolean) => {
    if (enabled && !window.confirm(`${SHARED_ADMIN_WARNING}\n\nHabilitar sesiones multiples para esta sede?`)) return;
    if (!enabled && !window.confirm("Se desactivara el modo compartido: los equipos dejaran de permitir cambios de sesion y sus perfiles guardados dejaran de funcionar. Continuar?")) return;
    void save({ enabled });
  };

  if (!config) return <p className="text-sm text-slate-500">{error ?? "Cargando..."}</p>;

  const idleInvalid = !Number.isInteger(draft.idleMinutes) || draft.idleMinutes < 2 || draft.idleMinutes > 60;
  const hoursInvalid = !Number.isInteger(draft.maxHours) || draft.maxHours < 1 || draft.maxHours > 12;
  const dirty = draft.idleMinutes !== config.idleMinutes || draft.maxHours !== config.maxHours;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sesiones multiples en equipos compartidos</h2>
            <p className="mt-1 max-w-[62ch] text-sm text-slate-500">
              Permite que varios profesionales usen el mismo computador por turnos y cambien de sesion con un clic, sin
              cerrar y abrir sesion cada vez. Esta apagado por defecto y cada equipo se activa aparte desde el menu lateral.
            </p>
          </div>
          <label htmlFor="shared-enabled" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              id="shared-enabled"
              type="checkbox"
              checked={config.enabled}
              disabled={saving}
              onChange={(event) => toggle(event.target.checked)}
              className="h-4 w-4 accent-[#0f9ea8]"
            />
            {config.enabled ? "Habilitado" : "Deshabilitado"}
          </label>
        </div>

        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{SHARED_ADMIN_WARNING}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label htmlFor="shared-idle" className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Minutos de inactividad para bloquear (2 a 60)
            <input
              id="shared-idle"
              type="number"
              min={2}
              max={60}
              value={Number.isNaN(draft.idleMinutes) ? "" : draft.idleMinutes}
              onChange={(e) => setDraft((d) => ({ ...d, idleMinutes: e.target.valueAsNumber }))}
              className="h-10 w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            />
          </label>
          <label htmlFor="shared-hours" className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Horas maximas sin reingresar la contrasena (1 a 12)
            <input
              id="shared-hours"
              type="number"
              min={1}
              max={12}
              value={Number.isNaN(draft.maxHours) ? "" : draft.maxHours}
              onChange={(e) => setDraft((d) => ({ ...d, maxHours: e.target.valueAsNumber }))}
              className="h-10 w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            />
          </label>
          <button
            type="button"
            disabled={saving || !dirty || idleInvalid || hoursInvalid}
            onClick={() => void save({ idleMinutes: draft.idleMinutes, maxHours: draft.maxHours })}
            className="h-10 rounded-xl bg-[#19b3bc] px-4 text-sm font-semibold text-white hover:bg-[#159ea7] disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Los administradores de sede siempre reingresan su contrasena al volver a su perfil. Los cambios aplican a los
          equipos en su proxima accion.
        </p>

        {saved ? <p className="mt-3 text-sm text-emerald-600">Cambios guardados.</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
