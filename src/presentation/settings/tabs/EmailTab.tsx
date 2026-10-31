"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Calendar,
  Bell,
  ChevronLeft,
  Eye,
  Pencil,
  CreditCard,
  Users,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
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
import { Card, Notice, StatusPill, btnClass, zs } from "@/presentation/ui/zs";

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


// Cada aviso como regla: que lo dispara y a quien le llega.
const FLOW: Record<EmailTemplateType, { when: string; to: string }> = {
  APPOINTMENT_CONFIRMATION: { when: "Se agenda una cita", to: "al paciente" },
  APPOINTMENT_REMINDER: { when: "Faltan 24 horas para la cita", to: "al paciente" },
  APPOINTMENT_CANCELLATION: { when: "La clínica cancela una cita", to: "al paciente" },
  PATIENT_WELCOME: { when: "Se registra un paciente nuevo", to: "al paciente" },
  USER_WELCOME: { when: "Se crea una cuenta del equipo", to: "a la persona nueva" },
  PAYMENT_UPDATE: { when: "Cambia el estado de un pago", to: "al paciente" },
  PROFESSIONAL_PAYOUT: { when: "Se cierra la liquidación del mes", to: "a cada profesional" },
  INTERNAL_ALERT: { when: "Ocurre un evento importante", to: "al equipo" },
};


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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#50c9d5]/20 border-t-[#50c9d5]" />
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
                ? "border-[#50c9d5] bg-[#50c9d5]/10 text-[#1e737b]"
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
            className="rounded-2xl bg-[#50c9d5] px-5 py-3 text-sm font-medium text-[#080b04] transition-colors hover:bg-[#45bcc8] disabled:cursor-not-allowed disabled:bg-[#50c9d5]/45"
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
    <div className="space-y-6">
      {error && <Notice tone="err">{error}</Notice>}

      {recommendedInactive.length > 0 && (
        <Notice icon={Sparkles}>
          <b className="font-semibold">Activa la confirmación y el recordatorio de cita.</b> Son los que más ayudan a que los pacientes lleguen.
        </Notice>
      )}

      <Card
        title={
          <>
            Avisos automáticos <StatusPill tone="ok">{totalEnabled} de {EMAIL_TEMPLATE_TYPES.length} activos</StatusPill>
          </>
        }
      >
        <p className={`${zs.small} -mt-2 mb-5`}>Cada aviso es una regla: cuando pasa algo, se envía un correo.</p>
        <div className="flex flex-col gap-6">
          {TEMPLATE_GROUPS.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h4 className={`${zs.label} mb-2`}>{group.label}</h4>
              <ul className="flex flex-col gap-2.5">
                {group.types.map((eventType) => {
                  const meta = EMAIL_TEMPLATE_META[eventType];
                  const flow = FLOW[eventType];
                  const existing = templates[eventType];
                  const isEnabled = existing?.enabled ?? true;
                  const isCustomized = !!existing;
                  return (
                    <li
                      key={eventType}
                      className={`flex flex-wrap items-center gap-3 rounded-[20px] border p-3 transition-[opacity,border-color] lg:flex-nowrap ${
                        isEnabled ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50 opacity-60"
                      }`}
                    >
                      {/* Disparador */}
                      <div className="flex min-w-0 flex-1 basis-56 items-center gap-2.5 rounded-2xl bg-[#e8a020]/[0.08] px-3 py-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e8a020]/[0.16] text-[#8a5a0b]">
                          <Zap className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a5a0b]">Cuando</span>
                          <span className="block truncate text-[14px] font-medium text-slate-900">{flow.when}</span>
                        </span>
                      </div>

                      <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-400 lg:block" strokeWidth={1.8} aria-hidden="true" />

                      {/* Accion */}
                      <div className="flex min-w-0 flex-1 basis-56 items-center gap-2.5 rounded-2xl bg-[#50c9d5]/[0.08] px-3 py-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#50c9d5]/20 text-[#1e737b]">
                          {TEMPLATE_ICONS[eventType]}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1e737b]">
                            Enviar correo {flow.to}
                          </span>
                          <span className="block truncate text-[14px] font-medium text-slate-900">
                            {meta.label}
                            {isCustomized ? <span className="ml-1.5 text-[12px] font-normal text-[#1e737b]">· tu texto</span> : null}
                          </span>
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => openEditor(eventType)} className={btnClass("quiet", "sm")}>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Mensaje
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={`${isEnabled ? "Desactivar" : "Activar"}: ${meta.label}`}
                          onClick={() => void handleToggleEnabled(eventType)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${isEnabled ? "bg-[#50c9d5]" : "bg-slate-300"}`}
                        >
                          <span className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      {success && (
        <div className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {success}
        </div>
      )}
    </div>
  );
}
