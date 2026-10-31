"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, HeartPulse } from "lucide-react";

type Settings = {
  enabled: boolean;
  slug: string | null;
  suggestedSlug: string;
  url: string | null;
  accounts: number;
  patients: number;
};

/** Configuracion del portal del paciente de la sede: enlace propio, activacion y cuentas creadas. */
export default function PortalSettings({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apply = (json: Settings) => {
    setSettings(json);
    setSlug(json.slug ?? json.suggestedSlug);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic-settings/portal", { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo cargar.");
      apply(json);
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
      const res = await fetch("/api/clinic-settings/portal", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo guardar.");
      apply(json);
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

  if (!settings) return <p className="text-sm text-slate-500">{error ?? "Cargando..."}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f7f8] text-[#0f8f98]">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Portal del paciente</h1>
          <p className="text-sm text-slate-500">
            Tus pacientes entran con su RUT o correo para ver y confirmar sus citas, su tratamiento, su historial y sus pagos.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Estado</h2>
            <p className="mt-1 text-sm text-slate-500">
              {settings.accounts} de {settings.patients} pacientes activos ya crearon su cuenta.
            </p>
          </div>
          <label htmlFor="portal-enabled" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              id="portal-enabled"
              type="checkbox"
              checked={settings.enabled}
              disabled={saving || !canEdit}
              onChange={(event) => void save({ enabled: event.target.checked, ...(settings.slug ? {} : { slug }) })}
              className="h-4 w-4 accent-[#0f9ea8]"
            />
            {settings.enabled ? "Activado" : "Desactivado"}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label htmlFor="portal-slug" className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
            Enlace de la clínica
            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
              <span className="border-r border-slate-200 bg-slate-50 px-3 leading-10 text-slate-400">/portal/</span>
              <input
                id="portal-slug"
                value={slug}
                disabled={!canEdit}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                className="h-full min-w-0 flex-1 px-3 text-slate-800 outline-none"
              />
            </div>
          </label>
          {canEdit ? (
            <button
              type="button"
              disabled={saving || slug === settings.slug}
              onClick={() => void save({ slug })}
              className="h-10 rounded-xl bg-[#19b3bc] px-4 text-sm font-medium text-white hover:bg-[#0f9ea8] disabled:opacity-50"
            >
              Guardar enlace
            </button>
          ) : null}
        </div>
        {!canEdit ? <p className="mt-2 text-xs text-slate-500">Solo un administrador puede cambiar el enlace o activar el portal.</p> : null}

        {settings.url ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Enlace para tus pacientes</p>
            <p className="mt-1 break-all text-sm text-slate-800">{settings.url}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-[#19b3bc]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
              {settings.enabled ? (
                <a
                  href={settings.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-[#19b3bc]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir portal
                </a>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {settings.enabled
                ? "Si cambias el enlace, el anterior deja de funcionar. Las cuentas de los pacientes se mantienen."
                : "El enlace no funciona mientras el portal esté desactivado."}
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="text-base font-semibold text-slate-900">Cómo crean su cuenta los pacientes</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Entran al enlace y eligen «Crea tu cuenta».</li>
          <li>Escriben su RUT y su correo. Si ya tienen ficha, el código llega al correo registrado en la ficha.</li>
          <li>Escriben el código de 6 números, crean su contraseña y entran de inmediato.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          Para que un paciente que ya existe pueda crear su cuenta, su ficha debe tener un correo.
        </p>
      </section>
    </div>
  );
}
