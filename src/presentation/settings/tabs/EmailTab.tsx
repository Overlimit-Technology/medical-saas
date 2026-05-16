"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Mail, ChevronLeft, Eye, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import {
  GetEmailTemplatesUseCase,
  SaveEmailTemplateUseCase,
} from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";
import {
  EMAIL_TEMPLATE_TYPES,
  EMAIL_TEMPLATE_META,
  DEFAULT_TEMPLATES,
  type EmailTemplateType,
  type EmailTemplate,
} from "@/domain/clinic-settings/entities/EmailTemplate";
import AdvancedEmailEditor from "@/presentation/common/AdvancedEmailEditor";

type TemplateMap = Partial<Record<EmailTemplateType, EmailTemplate>>;

function interpolatePreview(html: string, eventType: EmailTemplateType): string {
  const meta = EMAIL_TEMPLATE_META[eventType];
  let result = html;
  for (const v of meta.variables) {
    result = result.replaceAll(`{{${v.key}}}`, v.example);
  }
  return result;
}

function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export default function EmailTab() {
  const { getEmailTemplatesUseCase, saveEmailTemplateUseCase } = useMemo(() => {
    const repo = new ClinicSettingsRepositoryHttp();
    return {
      getEmailTemplatesUseCase: new GetEmailTemplatesUseCase(repo),
      saveEmailTemplateUseCase: new SaveEmailTemplateUseCase(repo),
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateMap>({});

  // Editor state
  const [editing, setEditing] = useState<EmailTemplateType | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const editorKeyRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getEmailTemplatesUseCase.execute();
        const map: TemplateMap = {};
        for (const t of items) {
          map[t.eventType] = t;
        }
        setTemplates(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar las plantillas.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [getEmailTemplatesUseCase]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(id);
  }, [success]);

  const openEditor = useCallback(
    (eventType: EmailTemplateType) => {
      const existing = templates[eventType];
      const defaults = DEFAULT_TEMPLATES[eventType];
      setSubject(existing?.subject ?? defaults.subject);

      const rawBody = existing?.body ?? defaults.body;
      const htmlBody = isHtmlContent(rawBody) ? rawBody : plainTextToHtml(rawBody);
      setBody(htmlBody);

      setEnabled(existing?.enabled ?? true);
      setEditing(eventType);
      setPreviewMode(false);
      editorKeyRef.current += 1;
    },
    [templates],
  );

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveEmailTemplateUseCase.execute({
        eventType: editing,
        subject,
        body,
        enabled,
      });
      setTemplates((prev) => ({ ...prev, [editing]: saved }));
      setSuccess("Plantilla guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (!editing) return;
    const defaults = DEFAULT_TEMPLATES[editing];
    setSubject(defaults.subject);
    const htmlBody = plainTextToHtml(defaults.body);
    setBody(htmlBody);
    editorKeyRef.current += 1;
  };

  const insertVariable = (key: string) => {
    const tag = `{{${key}}}`;
    setBody((prev) => prev + tag);
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

  // ---------- EDITOR VIEW ----------
  if (editing) {
    const meta = EMAIL_TEMPLATE_META[editing];
    const isCustomized = !!templates[editing];

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{meta.label}</h3>
            <p className="text-xs text-slate-500">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                previewMode
                  ? "border-[#19b3bc] bg-[#19b3bc]/10 text-[#19b3bc]"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {previewMode ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewMode ? "Editar" : "Vista previa"}
            </button>
          </div>
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-900">Enviar este email</p>
            <p className="text-xs text-slate-500">
              {enabled ? "Activo — se enviara automaticamente" : "Desactivado — no se enviara"}
            </p>
          </div>
          <button type="button" onClick={() => setEnabled((v) => !v)}>
            {enabled ? (
              <ToggleRight className="h-7 w-7 text-[#19b3bc]" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-slate-300" />
            )}
          </button>
        </div>

        {previewMode ? (
          /* ---------- PREVIEW ---------- */
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs text-slate-400">Asunto</p>
              <p className="text-sm font-medium text-slate-900">
                {interpolatePreview(subject, editing)}
              </p>
            </div>
            <div className="px-6 py-5">
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: interpolatePreview(body, editing),
                }}
              />
            </div>
          </section>
        ) : (
          /* ---------- EDITOR ---------- */
          <>
            {/* Subject */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <label className="grid gap-2 text-sm text-slate-600">
                <span className="font-medium">Asunto</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del email"
                  className={fieldClassName}
                />
              </label>
            </section>

            {/* Body — Advanced Email Editor (GrapesJS) */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-600">Cuerpo del email</p>
              <AdvancedEmailEditor
                key={editorKeyRef.current}
                content={body}
                onChange={setBody}
                placeholder="Escribe el contenido del email..."
              />
            </section>

            {/* Variable pills */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-3 text-xs font-medium text-slate-500">
                Variables disponibles (clic para insertar)
              </p>
              <div className="flex flex-wrap gap-2">
                {meta.variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#19b3bc] hover:bg-[#19b3bc]/10 hover:text-[#19b3bc]"
                    title={`Ejemplo: ${v.example}`}
                  >
                    {"{{"}
                    {v.key}
                    {"}}"}
                    <span className="ml-1.5 text-slate-400">— {v.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Restaurar predeterminado
          </button>
          <div className="flex items-center gap-3">
            {isCustomized && (
              <span className="text-xs text-slate-400">Personalizado</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-[#19b3bc] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#159ea7] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- TEMPLATE LIST VIEW ----------
  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Plantillas de email</h3>
            <p className="text-xs text-slate-500">
              Personaliza los emails que se envian automaticamente
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {EMAIL_TEMPLATE_TYPES.map((eventType) => {
            const meta = EMAIL_TEMPLATE_META[eventType];
            const existing = templates[eventType];
            const isCustomized = !!existing;
            const isEnabled = existing?.enabled ?? true;

            return (
              <button
                key={eventType}
                type="button"
                onClick={() => openEditor(eventType)}
                className="flex w-full items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                    {isCustomized && (
                      <span className="rounded-full bg-[#19b3bc]/10 px-2 py-0.5 text-[10px] font-medium text-[#19b3bc]">
                        Personalizado
                      </span>
                    )}
                    {!isEnabled && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
                </div>
                <ChevronLeft className="h-4 w-4 rotate-180 text-slate-300" />
              </button>
            );
          })}
        </div>
      </section>

      {success && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {success}
        </div>
      )}
    </div>
  );
}
