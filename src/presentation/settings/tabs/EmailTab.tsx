"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Mail,
  Calendar,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
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
import WysiwygEditor from "@/presentation/common/WysiwygEditor";

type TemplateMap = Partial<Record<EmailTemplateType, EmailTemplate>>;

const TEMPLATE_ICONS: Record<EmailTemplateType, React.ReactNode> = {
  APPOINTMENT_CONFIRMATION: <Calendar className="h-4 w-4" />,
  APPOINTMENT_REMINDER: <Bell className="h-4 w-4" />,
  APPOINTMENT_CANCELLATION: <Calendar className="h-4 w-4" />,
  PATIENT_WELCOME: <Users className="h-4 w-4" />,
  USER_WELCOME: <Users className="h-4 w-4" />,
  PAYMENT_UPDATE: <CreditCard className="h-4 w-4" />,
  PROFESSIONAL_PAYOUT: <CreditCard className="h-4 w-4" />,
  INTERNAL_ALERT: <AlertCircle className="h-4 w-4" />,
};

const TEMPLATE_COLORS: Record<EmailTemplateType, string> = {
  APPOINTMENT_CONFIRMATION: "bg-emerald-50 text-emerald-600",
  APPOINTMENT_REMINDER: "bg-amber-50 text-amber-600",
  APPOINTMENT_CANCELLATION: "bg-rose-50 text-rose-500",
  PATIENT_WELCOME: "bg-blue-50 text-blue-600",
  USER_WELCOME: "bg-violet-50 text-violet-600",
  PAYMENT_UPDATE: "bg-cyan-50 text-cyan-600",
  PROFESSIONAL_PAYOUT: "bg-teal-50 text-teal-600",
  INTERNAL_ALERT: "bg-slate-100 text-slate-500",
};

const RECOMMENDED = new Set<EmailTemplateType>([
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
]);

const TEMPLATE_GROUPS: { label: string; types: EmailTemplateType[] }[] = [
  {
    label: "Citas",
    types: ["APPOINTMENT_CONFIRMATION", "APPOINTMENT_REMINDER", "APPOINTMENT_CANCELLATION"],
  },
  {
    label: "Pacientes",
    types: ["PATIENT_WELCOME"],
  },
  {
    label: "Equipo",
    types: ["USER_WELCOME"],
  },
  {
    label: "Pagos",
    types: ["PAYMENT_UPDATE", "PROFESSIONAL_PAYOUT"],
  },
  {
    label: "Interno",
    types: ["INTERNAL_ALERT"],
  },
];

function interpolatePreview(html: string, eventType: EmailTemplateType): string {
  const meta = EMAIL_TEMPLATE_META[eventType];
  let result = html;
  for (const v of meta.variables) {
    result = result.replaceAll(`{{${v.key}}}`, `<strong>${v.example}</strong>`);
  }
  return result;
}

function interpolatePlain(text: string, eventType: EmailTemplateType): string {
  const meta = EMAIL_TEMPLATE_META[eventType];
  let result = text;
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

  const [editing, setEditing] = useState<EmailTemplateType | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const editorKeyRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getEmailTemplatesUseCase.execute();
        const map: TemplateMap = {};
        for (const t of items) map[t.eventType] = t;
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
      setBody(isHtmlContent(rawBody) ? rawBody : plainTextToHtml(rawBody));
      setEditing(eventType);
      setPreviewMode(false);
      editorKeyRef.current += 1;
    },
    [templates],
  );

  const handleToggleEnabled = useCallback(
    async (eventType: EmailTemplateType) => {
      const existing = templates[eventType];
      const defaults = DEFAULT_TEMPLATES[eventType];
      const currentEnabled = existing?.enabled ?? true;
      const newEnabled = !currentEnabled;

      setTemplates((prev) => ({
        ...prev,
        [eventType]: {
          id: existing?.id ?? "",
          eventType,
          subject: existing?.subject ?? defaults.subject,
          body: existing?.body ?? defaults.body,
          enabled: newEnabled,
        },
      }));

      try {
        const saved = await saveEmailTemplateUseCase.execute({
          eventType,
          subject: existing?.subject ?? defaults.subject,
          body: existing?.body ?? defaults.body,
          enabled: newEnabled,
        });
        setTemplates((prev) => ({ ...prev, [eventType]: saved }));
      } catch {
        setTemplates((prev) => ({
          ...prev,
          [eventType]: { ...prev[eventType]!, enabled: currentEnabled },
        }));
      }
    },
    [templates, saveEmailTemplateUseCase],
  );

  const handleSave = async () => {
    if (!editing) return;
    const currentEnabled = templates[editing]?.enabled ?? true;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveEmailTemplateUseCase.execute({
        eventType: editing,
        subject,
        body,
        enabled: currentEnabled,
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
    setBody(plainTextToHtml(defaults.body));
    editorKeyRef.current += 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]" />
      </div>
    );
  }

  // ---------- VISTA EDITOR ----------
  if (editing) {
    const meta = EMAIL_TEMPLATE_META[editing];

    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

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

        {previewMode ? (
          /* Preview en frame de email simulado */
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {/* Header simulado de cliente de email */}
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-500">De:</span>
                <span>noreply@tuclínica.cl</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-500">Para:</span>
                <span>paciente@email.com</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-800">
                {interpolatePlain(subject, editing)}
              </div>
            </div>
            {/* Cuerpo del email */}
            <div className="px-6 py-6">
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed text-slate-700"
                dangerouslySetInnerHTML={{ __html: interpolatePreview(body, editing) }}
              />
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <label className="grid gap-2 text-sm text-slate-600">
                <span className="font-medium">Asunto del email</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del email"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-3 text-sm font-medium text-slate-600">Mensaje</p>
              <WysiwygEditor
                key={editorKeyRef.current}
                content={body}
                onChange={setBody}
                variables={meta.variables}
              />
            </section>
          </>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Restaurar predeterminado
          </button>
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
    );
  }

  // ---------- LISTA ----------
  const totalEnabled = EMAIL_TEMPLATE_TYPES.filter(
    (t) => (templates[t]?.enabled ?? true),
  ).length;

  const recommendedInactive = (["APPOINTMENT_CONFIRMATION", "APPOINTMENT_REMINDER"] as EmailTemplateType[]).filter(
    (t) => !(templates[t]?.enabled ?? true),
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Banner recomendado — solo si los emails clave están desactivados */}
      {recommendedInactive.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Activa estos 2 emails para reducir los no-shows
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              La confirmacion y el recordatorio de cita son los mas efectivos para que los pacientes lleguen.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {/* Header con contador */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Emails automaticos</h3>
            <p className="text-xs text-slate-500">
              Activa o desactiva cada email. Personaliza el texto si lo necesitas.
            </p>
          </div>
          <div className="flex-shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {totalEnabled} de {EMAIL_TEMPLATE_TYPES.length} activos
          </div>
        </div>

        {/* Grupos de templates */}
        {TEMPLATE_GROUPS.map((group, groupIdx) => (
          <div key={group.label}>
            {/* Separador de grupo */}
            <div
              className={`flex items-center gap-3 px-6 py-2.5 ${groupIdx === 0 ? "" : "border-t border-slate-100"}`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </span>
              <div className="flex-1 border-t border-slate-100" />
            </div>

            {group.types.map((eventType) => {
              const meta = EMAIL_TEMPLATE_META[eventType];
              const existing = templates[eventType];
              const isEnabled = existing?.enabled ?? true;
              const isCustomized = !!existing;
              const isRecommended = RECOMMENDED.has(eventType);

              return (
                <div
                  key={eventType}
                  className={`flex items-center gap-4 px-6 py-3.5 transition-opacity ${isEnabled ? "opacity-100" : "opacity-40"}`}
                >
                  {/* Icono */}
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${TEMPLATE_COLORS[eventType]}`}
                  >
                    {TEMPLATE_ICONS[eventType]}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                      {isRecommended && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200">
                          <Sparkles className="h-2.5 w-2.5" />
                          Recomendado
                        </span>
                      )}
                      {isCustomized && isEnabled && (
                        <span className="rounded-full bg-[#19b3bc]/10 px-2 py-0.5 text-[10px] font-medium text-[#19b3bc]">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">{meta.description}</p>
                    <button
                      type="button"
                      onClick={() => openEditor(eventType)}
                      className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-[#19b3bc] hover:text-[#159ea7]"
                    >
                      Personalizar mensaje
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => void handleToggleEnabled(eventType)}
                    className="flex-shrink-0 transition-transform active:scale-95"
                    title={isEnabled ? "Desactivar" : "Activar"}
                  >
                    {isEnabled ? (
                      <ToggleRight className="h-7 w-7 text-[#19b3bc]" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {success && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {success}
        </div>
      )}
    </div>
  );
}
