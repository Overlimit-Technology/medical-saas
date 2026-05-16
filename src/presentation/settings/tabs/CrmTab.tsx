"use client";

import { useEffect, useMemo, useState } from "react";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import {
  GetCrmSettingsUseCase,
  UpdateCrmSettingsUseCase,
} from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";

type FormState = {
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappAccessToken: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
};

const EMPTY_FORM: FormState = {
  whatsappPhoneNumberId: "",
  whatsappBusinessAccountId: "",
  whatsappAccessToken: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  websiteUrl: "",
};

export default function CrmTab() {
  const { getCrmSettingsUseCase, updateCrmSettingsUseCase } = useMemo(() => {
    const repo = new ClinicSettingsRepositoryHttp();
    return {
      getCrmSettingsUseCase: new GetCrmSettingsUseCase(repo),
      updateCrmSettingsUseCase: new UpdateCrmSettingsUseCase(repo),
    };
  }, []);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCrmSettingsUseCase.execute();
        setForm({
          whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? "",
          whatsappBusinessAccountId: data.whatsappBusinessAccountId ?? "",
          whatsappAccessToken: data.whatsappAccessToken ?? "",
          instagramUrl: data.instagramUrl ?? "",
          facebookUrl: data.facebookUrl ?? "",
          tiktokUrl: data.tiktokUrl ?? "",
          websiteUrl: data.websiteUrl ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [getCrmSettingsUseCase]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(id);
  }, [success]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = await updateCrmSettingsUseCase.execute({
        whatsappPhoneNumberId: form.whatsappPhoneNumberId || null,
        whatsappBusinessAccountId: form.whatsappBusinessAccountId || null,
        whatsappAccessToken: form.whatsappAccessToken || null,
        instagramUrl: form.instagramUrl || null,
        facebookUrl: form.facebookUrl || null,
        tiktokUrl: form.tiktokUrl || null,
        websiteUrl: form.websiteUrl || null,
      });
      setForm({
        whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? "",
        whatsappBusinessAccountId: data.whatsappBusinessAccountId ?? "",
        whatsappAccessToken: data.whatsappAccessToken ?? "",
        instagramUrl: data.instagramUrl ?? "",
        facebookUrl: data.facebookUrl ?? "",
        tiktokUrl: data.tiktokUrl ?? "",
        websiteUrl: data.websiteUrl ?? "",
      });
      setSuccess("Configuracion CRM actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClassName =
    "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400";

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* WhatsApp Business */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-600">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.108-1.14l-.29-.174-3.012.79.804-2.937-.192-.303A7.963 7.963 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">WhatsApp Business</h3>
              <p className="text-xs text-slate-500">Conecta tu cuenta de WhatsApp Business API (Meta)</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Phone Number ID</span>
              <input
                value={form.whatsappPhoneNumberId}
                onChange={(e) => setForm({ ...form, whatsappPhoneNumberId: e.target.value })}
                placeholder="Ej: 1234567890"
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Business Account ID</span>
              <input
                value={form.whatsappBusinessAccountId}
                onChange={(e) => setForm({ ...form, whatsappBusinessAccountId: e.target.value })}
                placeholder="Ej: 9876543210"
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Access Token</span>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={form.whatsappAccessToken}
                  onChange={(e) => setForm({ ...form, whatsappAccessToken: e.target.value })}
                  placeholder="Token de acceso de Meta"
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showToken ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
          </div>
        </section>

        {/* Redes sociales */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Redes sociales</h3>
              <p className="text-xs text-slate-500">Links visibles para tu equipo y pacientes</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Instagram</span>
              <input
                value={form.instagramUrl}
                onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/tu-clinica"
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Facebook</span>
              <input
                value={form.facebookUrl}
                onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                placeholder="https://facebook.com/tu-clinica"
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span>TikTok</span>
              <input
                value={form.tiktokUrl}
                onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })}
                placeholder="https://tiktok.com/@tu-clinica"
                className={fieldClassName}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span>Sitio web</span>
              <input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://tu-clinica.cl"
                className={fieldClassName}
              />
            </label>
          </div>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[#19b3bc] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#159ea7] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>

      {success && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {success}
        </div>
      )}
    </div>
  );
}
