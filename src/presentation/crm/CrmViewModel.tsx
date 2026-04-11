"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmRepositoryHttp } from "@/data/crm/CrmRepository";
import { PatientsRepositoryHttp } from "@/data/patients/PatientsRepository";
import type { PaymentHistoryItem } from "@/domain/crm/entities/Crm";
import {
  GetCrmTreatmentsUseCase,
  GetPaymentHistoryUseCase,
  SavePaymentHistoryUseCase,
} from "@/domain/crm/usecases/CrmUseCases";
import type { PatientDetail } from "@/domain/patients/entities/Patient";
import { GetPatientsUseCase } from "@/domain/patients/usecases/PatientsUseCases";
import type { Treatment } from "@/domain/treatments/entities/Treatment";

export type Patient = Pick<PatientDetail, "id" | "firstName" | "lastName" | "secondLastName" | "run">;
export type { Treatment, PaymentHistoryItem };

export type FormState = {
  treatmentId: string;
  recordedAt: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: string;
  notes: string;
};

export const STATUS_LABEL: Record<PaymentHistoryItem["status"], string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  WAIVED: "Exento",
};

function formatDateInput(date: Date) {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-CL");
}

export function formatClp(value: number) {
  return `${new Intl.NumberFormat("es-CL").format(Math.round(value))} CLP`;
}

export function fullName(patient: Patient | null) {
  if (!patient) return "";
  return [patient.firstName, patient.lastName, patient.secondLastName ?? ""].join(" ").trim();
}

export function useCrmViewModel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    treatmentId: "",
    recordedAt: formatDateInput(new Date()),
    status: "PENDING",
    amount: "",
    notes: "",
  });

  const { getPatientsUseCase, getCrmTreatmentsUseCase, getPaymentHistoryUseCase, savePaymentHistoryUseCase } =
    useMemo(() => {
      const patientsRepo = new PatientsRepositoryHttp();
      const crmRepo = new CrmRepositoryHttp();
      return {
        getPatientsUseCase: new GetPatientsUseCase(patientsRepo),
        getCrmTreatmentsUseCase: new GetCrmTreatmentsUseCase(crmRepo),
        getPaymentHistoryUseCase: new GetPaymentHistoryUseCase(crmRepo),
        savePaymentHistoryUseCase: new SavePaymentHistoryUseCase(crmRepo),
      };
    }, []);

  const selectedPatient = useMemo(
    () => patients.find((item) => item.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const currentTreatment = treatments.find((item) => item.id === form.treatmentId) ?? null;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsResult, loadedTreatments] = await Promise.all([
        getPatientsUseCase.execute({ page: 1, pageSize: 200 }),
        getCrmTreatmentsUseCase.execute(),
      ]);

      const loadedPatients = patientsResult.items.map((patient) => ({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        secondLastName: patient.secondLastName,
        run: patient.run,
      }));

      setPatients(loadedPatients);
      setTreatments(loadedTreatments);

      if (loadedPatients.length > 0) {
        setSelectedPatientId(loadedPatients[0].id);
      }

      if (loadedTreatments.length > 0) {
        setForm((previous) => ({
          ...previous,
          treatmentId: loadedTreatments[0].id,
          amount: `${Math.round(loadedTreatments[0].price)}`,
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el modulo Gestion de contactos y cobros.");
    } finally {
      setLoading(false);
    }
  }, [getCrmTreatmentsUseCase, getPatientsUseCase]);

  const loadHistory = useCallback(async (patientId: string) => {
    if (!patientId) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setError(null);
    try {
      setHistory(await getPaymentHistoryUseCase.execute(patientId));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "No se pudo cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  }, [getPaymentHistoryUseCase]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    void loadHistory(selectedPatientId);
  }, [loadHistory, selectedPatientId]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find((item) => item.id === treatmentId);
    setForm((previous) => ({
      ...previous,
      treatmentId,
      amount: treatment ? `${Math.round(treatment.price)}` : previous.amount,
    }));
  };

  const handleFormChange = (key: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId || !form.treatmentId) return;

    setSaving(true);
    setError(null);
    try {
      const amount = form.amount.trim() ? Number(form.amount) : undefined;
      if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
        setError("El monto debe ser mayor que cero.");
        setSaving(false);
        return;
      }

      const recordedAt = new Date(`${form.recordedAt}T12:00:00`).toISOString();

      await savePaymentHistoryUseCase.execute({
        patientId: selectedPatientId,
        treatmentId: form.treatmentId,
        recordedAt,
        status: form.status,
        amount,
        notes: form.notes.trim() || null,
      });

      setSuccessMessage("Cobro registrado.");
      await loadHistory(selectedPatientId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el cobro.");
    } finally {
      setSaving(false);
    }
  };

  return {
    state: {
      patients,
      treatments,
      selectedPatientId,
      selectedPatient,
      history,
      loading,
      historyLoading,
      saving,
      error,
      successMessage,
      form,
      currentTreatment,
    },
    actions: {
      setSelectedPatientId,
      handleTreatmentChange,
      handleFormChange,
      handleSubmit,
    },
  };
}
