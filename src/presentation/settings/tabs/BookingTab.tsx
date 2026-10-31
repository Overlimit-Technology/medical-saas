"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

type BookingSettings = {
  enabled: boolean;
  slotMinutes: number;
  key: string | null;
  url: string | null;
};

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

export default function BookingTab() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic-settings/booking", { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setSettings({ enabled: json.enabled, slotMinutes: json.slotMinutes, key: json.key, url: json.url });
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
    try {
      const res = await fetch("/api/clinic-settings/booking", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setSettings({ enabled: json.enabled, slotMinutes: json.slotMinutes, key: json.key, url: json.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!settings?.url) return;
    try {
      await navigator.clipboard.writeText(settings.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!settings) {
    return <p className="text-sm text-slate-500">{error ?? "Cargando..."}</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Reserva online para pacientes</h2>
            <p className="mt-1 max-w-[60ch] text-sm text-slate-500">
              Los pacientes eligen profesional y hora en una pagina publica, con ayuda de un asistente de IA. Cada
              reserva llega a la agenda como pendiente de confirmacion y recepcion recibe un aviso.
            </p>
          </div>
          <label htmlFor="booking-enabled" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              id="booking-enabled"
              type="checkbox"
              checked={settings.enabled}
              disabled={saving}
              onChange={(event) => void save({ enabled: event.target.checked })}
              className="h-4 w-4 accent-[#0f9ea8]"
            />
            {settings.enabled ? "Activada" : "Desactivada"}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label htmlFor="booking-slot" className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Duracion de cada hora
            <select
              id="booking-slot"
              value={settings.slotMinutes}
              disabled={saving}
              onChange={(event) => void save({ slotMinutes: Number(event.target.value) })}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {SLOT_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutos
                </option>
              ))}
            </select>
          </label>
        </div>

        {settings.url ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Enlace publico</p>
            <p className="mt-1 break-all text-sm text-slate-800">{settings.url}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-[#50c9d5]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
              <a
                href={settings.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-[#50c9d5]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save({ regenerateKey: true })}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 hover:border-slate-300 disabled:opacity-50"
              >
                Cambiar enlace
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Si cambias el enlace, el anterior deja de funcionar. Las horas respetan el horario de la sede (lunes a
              sabado) y los boxes activos.
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
