"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  CalendarX2,
  Check,
  ChevronDown,
  CircleDashed,
  Loader2,
  Lock,
  Repeat,
  ShieldCheck,
  UserX,
  Wallet,
} from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationDraft,
  ConsultationSectionKey,
} from "@/domain/consultations/entities/Consultation";
import type { ClosureForm, FollowUpMode } from "../ConsultationViewModel";
import {
  CONSULTATION_STAGES,
  FOLLOW_UP_PRESETS,
  PLAN_FREQUENCY_PRESETS,
  type ConsultationStageKey,
} from "../consultation.constants";
import {
  formatCurrency,
  formatDate,
  fromDateTimeInputs,
  hasText,
  projectPlanSessions,
} from "../consultation.utils";
import SectionField from "./SectionField";
import StagePanel from "./StagePanel";

type Props = {
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  closure: ClosureForm;
  recordsCount: number;
  readOnly: boolean;
  closing: boolean;
  onSectionChange: (key: ConsultationSectionKey, value: string) => void;
  onUpdate: <K extends keyof ClosureForm>(key: K, value: ClosureForm[K]) => void;
  onTogglePlanTreatment: (treatmentId: string) => void;
  onApplyPreset: (days: number) => void;
  onGoToStage: (stage: ConsultationStageKey) => void;
  onClose: () => void;
};

const stage = CONSULTATION_STAGES[5];

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all duration-200 focus:border-[#19b3bc] focus:outline-none focus:ring-2 focus:ring-[#19b3bc]/15 disabled:bg-slate-50";

const FOLLOW_UP_OPTIONS: Array<{ mode: FollowUpMode; label: string; caption: string; icon: typeof Repeat }> = [
  { mode: "none", label: "Sin control", caption: "Alta o sin proxima cita", icon: CalendarX2 },
  { mode: "single", label: "Un control", caption: "Vuelve en una fecha", icon: CalendarPlus },
  { mode: "plan", label: "Plan de sesiones", caption: "Serie de N citas", icon: Repeat },
];

function SegmentedOption({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  caption,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: typeof Repeat;
  label: string;
  caption: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded-2xl border p-3.5 text-left transition-all duration-200 disabled:cursor-not-allowed ${
        active
          ? "border-[#19b3bc] bg-[#19b3bc]/[0.06] shadow-sm shadow-[#19b3bc]/10"
          : "border-slate-200 bg-white hover:border-[#19b3bc]/40"
      }`}
    >
      <span
        className={`flex items-center gap-2 text-sm font-semibold ${active ? "text-[#0f8f98]" : "text-slate-600"}`}
      >
        <Icon size={15} />
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-slate-400">{caption}</span>
    </button>
  );
}

export default function StageClosure({
  bootstrap,
  draft,
  closure,
  recordsCount,
  readOnly,
  closing,
  onSectionChange,
  onUpdate,
  onTogglePlanTreatment,
  onApplyPreset,
  onGoToStage,
  onClose,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const isNoShow = closure.outcome === "NO_SHOW";
  const locked = readOnly || closing;

  const checklist = useMemo(
    () => [
      {
        label: "Motivo de consulta",
        done: hasText(draft.sections.chiefComplaint),
        stage: "intake" as ConsultationStageKey,
      },
      {
        label: "Signos vitales",
        done: Object.values(draft.vitals).some((value) => hasText(value)),
        stage: "vitals" as ConsultationStageKey,
      },
      {
        label: "Anamnesis",
        done: hasText(draft.sections.anamnesis),
        stage: "assessment" as ConsultationStageKey,
      },
      {
        label: "Examen fisico",
        done: hasText(draft.sections.physicalExam),
        stage: "assessment" as ConsultationStageKey,
      },
      {
        label: "Ficha clinica",
        done: recordsCount > 0,
        stage: "records" as ConsultationStageKey,
      },
      {
        label: "Diagnostico",
        done: hasText(draft.sections.diagnosis),
        stage: "diagnosis" as ConsultationStageKey,
      },
      {
        label: "Indicaciones",
        done: hasText(draft.sections.indications),
        stage: "diagnosis" as ConsultationStageKey,
      },
    ],
    [draft, recordsCount]
  );

  const doneCount = checklist.filter((item) => item.done).length;
  const completion = Math.round((doneCount / checklist.length) * 100);

  const planPreview = useMemo(() => {
    if (closure.followUpMode !== "plan") return [];
    const start = fromDateTimeInputs(closure.followUpDate, closure.followUpTime);
    if (!start) return [];
    return projectPlanSessions(start, Number(closure.planSessions), Number(closure.planFrequency));
  }, [closure]);

  const selectedChargeTreatment = bootstrap.catalog.treatments.find(
    (item) => item.id === closure.chargeTreatmentId
  );

  return (
    <StagePanel stage={stage}>
      <div className="space-y-6">
        {/* ------------------------------------------------ estado de la ficha */}
        <div className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Completitud de la atencion</p>
              <p className="text-xs text-slate-400">
                Nada de esto es obligatorio: es tu resumen antes de firmar.
              </p>
            </div>
            <span className="text-2xl font-semibold tabular-nums text-[#0f8f98]">
              {completion}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#19b3bc] to-[#0f8f98] transition-[width] duration-700 ease-out"
              style={{ width: `${completion}%` }}
            />
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {checklist.map((item, index) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => onGoToStage(item.stage)}
                  className="animate-rise-in flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  {item.done ? (
                    <Check size={14} strokeWidth={3} className="shrink-0 text-emerald-500" />
                  ) : (
                    <CircleDashed size={14} className="shrink-0 text-slate-300" />
                  )}
                  <span className={item.done ? "text-slate-700" : "text-slate-400"}>
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ------------------------------------------------------ no asistio */}
        <button
          type="button"
          disabled={locked}
          onClick={() => onUpdate("outcome", isNoShow ? "COMPLETED" : "NO_SHOW")}
          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 disabled:cursor-not-allowed ${
            isNoShow
              ? "border-rose-300 bg-rose-50"
              : "border-slate-200 bg-white hover:border-rose-200"
          }`}
        >
          <UserX size={16} className={isNoShow ? "text-rose-600" : "text-slate-300"} />
          <span className="flex-1">
            <span
              className={`block text-sm font-semibold ${isNoShow ? "text-rose-700" : "text-slate-600"}`}
            >
              El paciente no asistio
            </span>
            <span className="block text-xs text-slate-400">
              Cierra la cita como ausencia. No se agenda control ni se cobra la atencion.
            </span>
          </span>
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              isNoShow ? "bg-rose-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                isNoShow ? "translate-x-5" : ""
              }`}
            />
          </span>
        </button>

        {!isNoShow && (
          <>
            {/* ------------------------------------------------ proximo control */}
            <div className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-5">
              <p className="text-sm font-semibold text-slate-800">Proximo control</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Lo que elijas aca se agenda de verdad al cerrar la consulta.
              </p>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                {FOLLOW_UP_OPTIONS.map((option) => (
                  <SegmentedOption
                    key={option.mode}
                    active={closure.followUpMode === option.mode}
                    disabled={locked}
                    onClick={() => onUpdate("followUpMode", option.mode)}
                    icon={option.icon}
                    label={option.label}
                    caption={option.caption}
                  />
                ))}
              </div>

              {closure.followUpMode !== "none" && (
                <div className="animate-slide-down mt-5 space-y-4 overflow-hidden">
                  {closure.followUpMode === "single" && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Vuelve en
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLLOW_UP_PRESETS.map((preset) => (
                          <button
                            key={preset.days}
                            type="button"
                            disabled={locked}
                            onClick={() => onApplyPreset(preset.days)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-200 hover:-translate-y-px hover:border-[#19b3bc]/50 hover:text-[#0f8f98] disabled:cursor-not-allowed"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {closure.followUpMode === "plan" && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Nombre del plan
                        </label>
                        <input
                          type="text"
                          value={closure.planName}
                          disabled={locked}
                          placeholder="Kinesiologia lumbar - fase 1"
                          onChange={(event) => onUpdate("planName", event.target.value)}
                          className={fieldClassName}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Sesiones
                          </label>
                          <input
                            type="number"
                            min={2}
                            max={90}
                            value={closure.planSessions}
                            disabled={locked}
                            onChange={(event) => onUpdate("planSessions", event.target.value)}
                            className={fieldClassName}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Cada cuantos dias
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={closure.planFrequency}
                            disabled={locked}
                            onChange={(event) => onUpdate("planFrequency", event.target.value)}
                            className={fieldClassName}
                          />
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {PLAN_FREQUENCY_PRESETS.map((preset) => (
                              <button
                                key={preset.days}
                                type="button"
                                disabled={locked}
                                onClick={() => onUpdate("planFrequency", String(preset.days))}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 disabled:cursor-not-allowed ${
                                  closure.planFrequency === String(preset.days)
                                    ? "border-[#19b3bc] bg-[#19b3bc]/10 text-[#0f8f98]"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-[#19b3bc]/40"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Tratamientos del plan
                        </p>
                        {bootstrap.catalog.treatments.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            No hay tratamientos cargados en la clinica.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {bootstrap.catalog.treatments.map((treatment) => {
                              const selected = closure.planTreatmentIds.includes(treatment.id);
                              return (
                                <button
                                  key={treatment.id}
                                  type="button"
                                  disabled={locked}
                                  onClick={() => onTogglePlanTreatment(treatment.id)}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed ${
                                    selected
                                      ? "border-[#19b3bc] bg-[#19b3bc]/10 text-[#0f8f98]"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-[#19b3bc]/40"
                                  }`}
                                >
                                  {selected && <Check size={12} strokeWidth={3} />}
                                  {treatment.name}
                                  <span className="text-slate-400">
                                    {formatCurrency(treatment.price)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={closure.followUpDate}
                        disabled={locked}
                        onChange={(event) => onUpdate("followUpDate", event.target.value)}
                        className={fieldClassName}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={closure.followUpTime}
                        disabled={locked}
                        onChange={(event) => onUpdate("followUpTime", event.target.value)}
                        className={fieldClassName}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Minutos
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={closure.followUpDuration}
                        disabled={locked}
                        onChange={(event) => onUpdate("followUpDuration", event.target.value)}
                        className={fieldClassName}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Box
                      </label>
                      <div className="relative">
                        <select
                          value={closure.followUpBoxId}
                          disabled={locked}
                          onChange={(event) => onUpdate("followUpBoxId", event.target.value)}
                          className={`${fieldClassName} appearance-none pr-9`}
                        >
                          {bootstrap.catalog.boxes.map((box) => (
                            <option key={box.id} value={box.id}>
                              {box.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={15}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#19b3bc]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Nota para la proxima cita
                    </label>
                    <input
                      type="text"
                      value={closure.followUpNotes}
                      disabled={locked}
                      maxLength={250}
                      placeholder="Traer resultado de imagenes"
                      onChange={(event) => onUpdate("followUpNotes", event.target.value)}
                      className={fieldClassName}
                    />
                  </div>

                  {planPreview.length > 0 && (
                    <div className="rounded-2xl border border-[#19b3bc]/20 bg-[#19b3bc]/[0.04] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f8f98]">
                        Se agendaran {planPreview.length} sesiones
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {planPreview.slice(0, 8).map((date, index) => (
                          <span
                            key={date.toISOString()}
                            className="animate-pop-in rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-[#19b3bc]/15"
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            {formatDate(date)}
                          </span>
                        ))}
                        {planPreview.length > 8 && (
                          <span className="px-2 py-1 text-[11px] text-slate-400">
                            +{planPreview.length - 8} mas
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Si alguna sesion choca con otra cita, el cierre se detiene y te avisa cual.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- cobro */}
            <div className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Wallet size={15} className="text-[#19b3bc]" /> Cobro de la atencion
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Se registra en la caja del dia junto con el tratamiento realizado.
                  </p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={closure.chargeEnabled}
                    disabled={locked}
                    onChange={(event) => onUpdate("chargeEnabled", event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative inline-flex h-6 w-11 items-center">
                    <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#19b3bc]" />
                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>

              {closure.chargeEnabled && (
                <div className="animate-slide-down mt-4 space-y-3 overflow-hidden">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Tratamiento
                      </label>
                      <div className="relative">
                        <select
                          value={closure.chargeTreatmentId}
                          disabled={locked}
                          onChange={(event) => {
                            const treatment = bootstrap.catalog.treatments.find(
                              (item) => item.id === event.target.value
                            );
                            onUpdate("chargeTreatmentId", event.target.value);
                            // Precargar el precio de lista ahorra un paso; sigue siendo editable.
                            if (treatment && !closure.chargeAmount) {
                              onUpdate("chargeAmount", String(treatment.price));
                            }
                          }}
                          className={`${fieldClassName} appearance-none pr-9`}
                        >
                          <option value="">Selecciona un tratamiento</option>
                          {bootstrap.catalog.treatments.map((treatment) => (
                            <option key={treatment.id} value={treatment.id}>
                              {treatment.name} · {formatCurrency(treatment.price)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={15}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#19b3bc]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Monto
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={closure.chargeAmount}
                        disabled={locked}
                        placeholder={
                          selectedChargeTreatment ? String(selectedChargeTreatment.price) : "0"
                        }
                        onChange={(event) => onUpdate("chargeAmount", event.target.value)}
                        className={`${fieldClassName} tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { value: "PAID", label: "Pagado" },
                        { value: "PENDING", label: "Pendiente" },
                        { value: "WAIVED", label: "Exento" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={locked}
                        onClick={() => onUpdate("chargeStatus", option.value)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed ${
                          closure.chargeStatus === option.value
                            ? "border-[#19b3bc] bg-[#19b3bc]/10 text-[#0f8f98]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-[#19b3bc]/40"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={closure.chargeNotes}
                    disabled={locked}
                    maxLength={250}
                    placeholder="Nota del cobro (opcional)"
                    onChange={(event) => onUpdate("chargeNotes", event.target.value)}
                    className={fieldClassName}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* --------------------------------------------------- nota interna */}
        <div className="animate-rise-in rounded-2xl border border-slate-100 bg-white p-5">
          <SectionField
            sectionKey="privateNote"
            value={draft.sections.privateNote ?? ""}
            readOnly={locked}
            onChange={onSectionChange}
          />
        </div>

        {/* ---------------------------------------------------------- cierre */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Lock size={14} className="text-slate-400" /> Firmar y cerrar
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Al cerrar, todo lo escrito deja de ser borrador y queda como registro clinico de la
            atencion. La cita pasa a{" "}
            <span className="font-semibold">{isNoShow ? "No asistio" : "Completada"}</span>
            {closure.followUpMode !== "none" && !isNoShow ? " y se agenda el control." : "."}
          </p>

          {confirming ? (
            <div className="animate-slide-down mt-4 flex flex-col gap-2.5 overflow-hidden sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={closing}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 disabled:cursor-not-allowed sm:flex-1"
              >
                Volver a revisar
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={closing}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60 sm:flex-1 ${
                  isNoShow
                    ? "bg-rose-600 shadow-rose-600/25 hover:bg-rose-700"
                    : "bg-[#19b3bc] shadow-[#19b3bc]/30 hover:bg-[#159ea7]"
                }`}
              >
                {closing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Cerrando...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    {isNoShow ? "Confirmar ausencia" : "Confirmar cierre"}
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() => setConfirming(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <ShieldCheck size={16} />
              {isNoShow ? "Cerrar como ausencia" : "Cerrar consulta"}
            </button>
          )}
        </div>
      </div>
    </StagePanel>
  );
}
