"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { ConsultationsRepositoryHttp } from "@/data/consultations/ConsultationsRepository";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationSectionKey,
  ConsultationVisit,
  ConsultationVitalKey,
  PatientBackgroundData,
} from "@/domain/consultations/entities/Consultation";
import { ClinicalLockedClientError } from "@/data/consultations/ConsultationsRepository";
import { CLINICAL_UNLOCKED_EVENT } from "@/presentation/clinical/ClinicalLock";
import type { AttentionTypeDef } from "@/lib/clinical/attentionTypes";
import {
  CloseConsultationUseCase,
  GetConsultationUseCase,
  SaveConsultationDraftUseCase,
  StartConsultationUseCase,
} from "@/domain/consultations/usecases/ConsultationsUseCases";
import {
  AUTOSAVE_DELAY_MS,
  stagesFor,
  type ConsultationStageKey,
} from "./consultation.constants";
import {
  addDays,
  fromDateTimeInputs,
  minutesBetween,
  toDateInputValue,
  toTimeInputValue,
} from "./consultation.utils";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
export type FollowUpMode = "none" | "single" | "plan";

export type ClosureForm = {
  followUpMode: FollowUpMode;
  followUpDate: string;
  followUpTime: string;
  followUpDuration: string;
  followUpBoxId: string;
  followUpNotes: string;
  planName: string;
  planSessions: string;
  planFrequency: string;
  planTreatmentIds: string[];
  chargeEnabled: boolean;
  chargeTreatmentId: string;
  chargeAmount: string;
  chargeStatus: "PENDING" | "PAID" | "WAIVED";
  chargeNotes: string;
  outcome: "COMPLETED" | "NO_SHOW";
};

const EMPTY_DRAFT: ConsultationDraft = { sections: {}, vitals: {}, blocks: {} };

function buildInitialClosure(bootstrap: ConsultationBootstrap): ClosureForm {
  const start = new Date(bootstrap.appointment.startAt);
  const suggested = addDays(start, 7);
  const payment = bootstrap.appointment.paymentEntry;

  return {
    followUpMode: "none",
    followUpDate: toDateInputValue(suggested),
    followUpTime: toTimeInputValue(start),
    followUpDuration: String(
      minutesBetween(bootstrap.appointment.startAt, bootstrap.appointment.endAt)
    ),
    followUpBoxId: bootstrap.appointment.boxId,
    followUpNotes: "",
    planName: "",
    planSessions: "6",
    planFrequency: "7",
    planTreatmentIds: [],
    chargeEnabled: Boolean(payment),
    chargeTreatmentId: payment?.treatment.id ?? "",
    chargeAmount: payment ? String(payment.amount) : "",
    chargeStatus: payment?.status ?? "PENDING",
    chargeNotes: payment?.notes ?? "",
    outcome: "COMPLETED",
  };
}

export function useConsultationViewModel(appointmentId: string) {
  const [bootstrap, setBootstrap] = useState<ConsultationBootstrap | null>(null);
  const [visit, setVisit] = useState<ConsultationVisit | null>(null);
  const [draft, setDraft] = useState<ConsultationDraft>(EMPTY_DRAFT);
  const [stage, setStage] = useState<ConsultationStageKey>("intake");
  const [role, setRole] = useState<string | null>(null);
  const [attention, setAttention] = useState<AttentionTypeDef | null>(null);
  const [background, setBackground] = useState<PatientBackgroundData | null>(null);
  const [backgroundState, setBackgroundState] = useState<SaveState>("idle");
  const [backgroundRevision, setBackgroundRevision] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [closure, setClosure] = useState<ClosureForm | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<ConsultationClosureResult | null>(null);

  // Contador de ediciones: dispara el autoguardado sin confundir la hidratacion
  // inicial del borrador con un cambio del profesional.
  const [revision, setRevision] = useState(0);
  const draftRef = useRef<ConsultationDraft>(EMPTY_DRAFT);
  draftRef.current = draft;
  const backgroundRef = useRef<PatientBackgroundData | null>(null);
  backgroundRef.current = background;

  const useCases = useMemo(() => {
    const repo = new ConsultationsRepositoryHttp();
    return {
      repo,
      get: new GetConsultationUseCase(repo),
      start: new StartConsultationUseCase(repo),
      save: new SaveConsultationDraftUseCase(repo),
      close: new CloseConsultationUseCase(repo),
      session: new GetCurrentSessionUseCase(new AuthRepositoryHttp()),
    };
  }, []);

  const canWrite = role === "DOCTOR";
  const isStarted = Boolean(visit);
  const isClosed = Boolean(closeResult);

  // ------------------------------------------------------------------- carga

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const session = await useCases.session.execute();
        if (!cancelled) setRole(session.role);
      } catch {
        if (!cancelled) setRole(null);
      }

      try {
        const data = await useCases.get.execute(appointmentId);
        if (cancelled) return;

        setBootstrap(data);
        setDraft({ ...data.draft, blocks: data.draft.blocks ?? {} });
        setVisit(data.visit);
        setAttention(data.attention.selected);
        setBackground(data.background);
        setClosure(buildInitialClosure(data));
      } catch (error) {
        // Con la ficha bloqueada no es un error: el candado la muestra y al desbloquear se recarga.
        if (error instanceof ClinicalLockedClientError) return;
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "No se pudo cargar la consulta."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, useCases, reloadKey]);

  // ---------------------------------------------------------- autoguardado

  const flushDraft = useCallback(async () => {
    if (!visit || !canWrite) return;

    setSaveState("saving");
    try {
      const result = await useCases.save.execute(appointmentId, draftRef.current);
      setLastSavedAt(result.savedAt);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      if (error instanceof ClinicalLockedClientError) return;
      setActionError(error instanceof Error ? error.message : "No se pudo guardar el avance.");
    }
  }, [appointmentId, canWrite, useCases, visit]);

  const flushBackground = useCallback(async () => {
    const data = backgroundRef.current;
    if (!data || !canWrite) return;
    setBackgroundState("saving");
    try {
      const { updatedAt } = await useCases.repo.saveBackground(appointmentId, {
        allergies: data.allergies,
        diseases: data.diseases,
        medications: data.medications,
        surgeries: data.surgeries,
      });
      setBackground((current) => (current ? { ...current, updatedAt } : current));
      setBackgroundState("saved");
    } catch (error) {
      setBackgroundState("error");
      if (!(error instanceof ClinicalLockedClientError)) {
        setActionError(error instanceof Error ? error.message : "No se pudieron guardar los antecedentes.");
      }
    }
  }, [appointmentId, canWrite, useCases]);

  useEffect(() => {
    if (backgroundRevision === 0 || !canWrite) return;
    setBackgroundState("pending");
    const timer = window.setTimeout(() => void flushBackground(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [backgroundRevision, canWrite, flushBackground]);

  // Al desbloquear con el PIN: si la ficha no alcanzo a cargar, se carga; si quedo algo sin guardar, se guarda.
  useEffect(() => {
    const onUnlocked = () => {
      if (!bootstrap) setReloadKey((k) => k + 1);
      else {
        if (saveState === "error" || saveState === "pending") void flushDraft();
        if (backgroundState === "error") void flushBackground();
      }
    };
    window.addEventListener(CLINICAL_UNLOCKED_EVENT, onUnlocked);
    return () => window.removeEventListener(CLINICAL_UNLOCKED_EVENT, onUnlocked);
  }, [bootstrap, saveState, backgroundState, flushDraft, flushBackground]);

  useEffect(() => {
    if (revision === 0 || !visit || !canWrite || isClosed) return;

    setSaveState("pending");
    const timer = window.setTimeout(() => void flushDraft(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [revision, visit, canWrite, isClosed, flushDraft]);

  // Aviso del navegador si se intenta salir con cambios sin confirmar.
  useEffect(() => {
    if (saveState !== "pending" && saveState !== "saving") return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  // ---------------------------------------------------------------- acciones

  const startConsultation = useCallback(async (attentionTypeKey: string, consentSigner: string | null) => {
    setStarting(true);
    setActionError(null);

    try {
      const started = await useCases.start.execute(appointmentId, {
        attentionTypeKey,
        consent: consentSigner ? { signerName: consentSigner } : null,
      });
      setVisit(started);
      setAttention(bootstrap?.attention.types.find((type) => type.key === attentionTypeKey) ?? null);
      setStage("intake");
    } catch (error) {
      if (!(error instanceof ClinicalLockedClientError)) {
        setActionError(error instanceof Error ? error.message : "No se pudo iniciar la consulta.");
      }
    } finally {
      setStarting(false);
    }
  }, [appointmentId, bootstrap, useCases]);

  const setBlock = useCallback((fieldId: string, value: string) => {
    setDraft((previous) => ({ ...previous, blocks: { ...(previous.blocks ?? {}), [fieldId]: value } }));
    setRevision((current) => current + 1);
  }, []);

  /** Antecedentes generales: alergias y farmacos tambien quedan en la atencion de hoy. */
  const setBackgroundField = useCallback(
    (key: keyof Omit<PatientBackgroundData, "updatedAt">, value: string) => {
      setBackground((current) => (current ? { ...current, [key]: value } : current));
      setBackgroundRevision((current) => current + 1);
      if (key === "allergies" || key === "medications") {
        const section = key === "allergies" ? "allergies" : "currentMedication";
        setDraft((previous) => ({ ...previous, sections: { ...previous.sections, [section]: value } }));
        setRevision((current) => current + 1);
      }
    },
    []
  );

  const setSection = useCallback((key: ConsultationSectionKey, value: string) => {
    setDraft((previous) => ({
      ...previous,
      sections: { ...previous.sections, [key]: value },
    }));
    setRevision((current) => current + 1);
  }, []);

  const setVital = useCallback((key: ConsultationVitalKey, value: string) => {
    setDraft((previous) => ({
      ...previous,
      vitals: { ...previous.vitals, [key]: value },
    }));
    setRevision((current) => current + 1);
  }, []);

  /** Copia las ultimas mediciones conocidas a los campos que siguen vacios. */
  const copyPreviousVitals = useCallback(() => {
    if (!bootstrap) return;

    setDraft((previous) => {
      const vitals = { ...previous.vitals };
      for (const [key, reading] of Object.entries(bootstrap.history.lastVitals)) {
        const vitalKey = key as ConsultationVitalKey;
        if (!vitals[vitalKey]?.trim() && reading) {
          vitals[vitalKey] = String(reading.value);
        }
      }
      return { ...previous, vitals };
    });
    setRevision((current) => current + 1);
  }, [bootstrap]);

  const updateClosure = useCallback(<K extends keyof ClosureForm>(key: K, value: ClosureForm[K]) => {
    setClosure((previous) => (previous ? { ...previous, [key]: value } : previous));
  }, []);

  const togglePlanTreatment = useCallback((treatmentId: string) => {
    setClosure((previous) => {
      if (!previous) return previous;
      const selected = previous.planTreatmentIds.includes(treatmentId);
      return {
        ...previous,
        planTreatmentIds: selected
          ? previous.planTreatmentIds.filter((id) => id !== treatmentId)
          : [...previous.planTreatmentIds, treatmentId],
      };
    });
  }, []);

  /** Atajo "vuelve en N dias": mueve la fecha manteniendo la hora elegida. */
  const applyFollowUpPreset = useCallback(
    (days: number) => {
      if (!bootstrap) return;
      const base = new Date(bootstrap.appointment.startAt);
      updateClosure("followUpDate", toDateInputValue(addDays(base, days)));
    },
    [bootstrap, updateClosure]
  );

  /** Traduce el formulario de cierre al contrato del dominio. */
  const buildClosureInput = useCallback((): ConsultationClosureInput | { error: string } => {
    if (!closure || !bootstrap) return { error: "La consulta aun no esta lista." };

    let followUp: ConsultationClosureInput["followUp"] = null;

    if (closure.followUpMode !== "none" && closure.outcome === "COMPLETED") {
      const startAt = fromDateTimeInputs(closure.followUpDate, closure.followUpTime);
      if (!startAt) return { error: "Indica fecha y hora del proximo control." };
      if (startAt.getTime() <= Date.now()) {
        return { error: "El proximo control debe quedar en el futuro." };
      }

      const durationMinutes = Number(closure.followUpDuration);
      if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
        return { error: "La duracion del control debe ser de al menos 5 minutos." };
      }

      if (closure.followUpMode === "single") {
        followUp = {
          mode: "single",
          startAt: startAt.toISOString(),
          durationMinutes,
          boxId: closure.followUpBoxId || bootstrap.appointment.boxId,
          notes: closure.followUpNotes.trim() || null,
        };
      } else {
        const totalSessions = Number(closure.planSessions);
        const frequencyDays = Number(closure.planFrequency);

        if (!closure.planName.trim()) return { error: "Ponle un nombre al plan de sesiones." };
        if (!Number.isInteger(totalSessions) || totalSessions < 2) {
          return { error: "Un plan necesita al menos 2 sesiones." };
        }
        if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
          return { error: "Indica cada cuantos dias se repite la sesion." };
        }
        if (closure.planTreatmentIds.length === 0) {
          return { error: "Selecciona al menos un tratamiento para el plan." };
        }

        followUp = {
          mode: "plan",
          name: closure.planName.trim(),
          startAt: startAt.toISOString(),
          durationMinutes,
          boxId: closure.followUpBoxId || bootstrap.appointment.boxId,
          totalSessions,
          frequencyDays,
          treatmentIds: closure.planTreatmentIds,
          notes: closure.followUpNotes.trim() || null,
        };
      }
    }

    let charge: ConsultationClosureInput["charge"] = null;

    if (closure.chargeEnabled && closure.outcome === "COMPLETED") {
      const amount = Number(closure.chargeAmount);
      if (!closure.chargeTreatmentId) return { error: "Elige el tratamiento a cobrar." };
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: "El monto del cobro debe ser mayor a cero." };
      }

      charge = {
        treatmentId: closure.chargeTreatmentId,
        amount,
        status: closure.chargeStatus,
        notes: closure.chargeNotes.trim() || null,
      };
    }

    return { draft: draftRef.current, followUp, charge, outcome: closure.outcome };
  }, [bootstrap, closure]);

  const closeConsultation = useCallback(async () => {
    const input = buildClosureInput();
    if ("error" in input) {
      setActionError(input.error);
      return;
    }

    setClosing(true);
    setActionError(null);

    try {
      const result = await useCases.close.execute(appointmentId, input);
      setCloseResult(result);
      setSaveState("saved");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo cerrar la consulta.");
    } finally {
      setClosing(false);
    }
  }, [appointmentId, buildClosureInput, useCases]);

  // ------------------------------------------------------------- navegacion

  const stages = useMemo(() => stagesFor(attention), [attention]);
  const stageIndex = Math.max(0, stages.findIndex((item) => item.key === stage));

  const goToStage = useCallback((next: ConsultationStageKey) => {
    setStage(next);
    setActionError(null);
  }, []);

  const goNext = useCallback(() => {
    const next = stages[stageIndex + 1];
    if (next) goToStage(next.key);
  }, [goToStage, stageIndex, stages]);

  const goPrevious = useCallback(() => {
    const previous = stages[stageIndex - 1];
    if (previous) goToStage(previous.key);
  }, [goToStage, stageIndex, stages]);

  return {
    state: {
      bootstrap,
      visit,
      draft,
      stage,
      stageIndex,
      stages,
      attention,
      background,
      backgroundState,
      role,
      canWrite,
      isStarted,
      isClosed,
      loading,
      loadError,
      starting,
      actionError,
      saveState,
      lastSavedAt,
      closure,
      closing,
      closeResult,
    },
    actions: {
      startConsultation,
      setSection,
      setVital,
      setBlock,
      setBackgroundField,
      copyPreviousVitals,
      updateClosure,
      togglePlanTreatment,
      applyFollowUpPreset,
      closeConsultation,
      flushDraft,
      goToStage,
      goNext,
      goPrevious,
      dismissError: () => setActionError(null),
    },
  };
}
