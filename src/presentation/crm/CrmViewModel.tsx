"use client";

import { useEffect, useMemo, useState } from "react";

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
};

export type Treatment = {
  id: string;
  name: string;
  price: number;
};

export type PaymentHistoryItem = {
  id: string;
  recordedAt: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: number;
  treatment: {
    id: string;
    name: string;
    price: number;
  };
};

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

  const selectedPatient = useMemo(
    () => patients.find((item) => item.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const currentTreatment = treatments.find((item) => item.id === form.treatmentId) ?? null;

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, treatmentsRes] = await Promise.all([
        fetch("/api/patients?page=1&pageSize=200"),
        fetch("/api/crm/treatments"),
      ]);

      const patientsData = await patientsRes.json();
      const treatmentsData = await treatmentsRes.json();

      if (!patientsData.ok) {
        setError(patientsData.error ?? "No se pudieron cargar los pacientes.");
        return;
      }
      if (!treatmentsData.ok) {
        setError(treatmentsData.error ?? "No se pudieron cargar los tratamientos.");
        return;
      }

      const loadedPatients = patientsData.items ?? [];
      const loadedTreatments = treatmentsData.items ?? [];

      setPatients(loadedPatients);
      setTreatments(loadedTreatments);

      if (loadedPatients.length > 0) {
        setSelectedPatientId(loadedPatients[0].id);
      }

      if (loadedTreatments.length > 0) {
        setForm((prev) => ({
          ...prev,
          treatmentId: loadedTreatments[0].id,
          amount: `${Math.round(loadedTreatments[0].price)}`,
        }));
      }
    } catch {
      setError("No se pudo cargar el modulo Gestion de contactos y cobros.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (patientId: string) => {
    if (!patientId) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/payment-history?patientId=${encodeURIComponent(patientId)}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "No se pudo cargar el historial.");
        return;
      }
      setHistory(data.items ?? []);
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    loadHistory(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const handleTreatmentChange = (treatmentId: string) => {
    const treatment = treatments.find((item) => item.id === treatmentId);
    setForm((prev) => ({
      ...prev,
      treatmentId,
      amount: treatment ? `${Math.round(treatment.price)}` : prev.amount,
    }));
  };

  const handleFormChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

      const res = await fetch("/api/crm/payment-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          treatmentId: form.treatmentId,
          recordedAt,
          status: form.status,
          amount,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error ?? "No se pudo registrar el cobro.");
        return;
      }

      setSuccessMessage("Cobro registrado.");
      await loadHistory(selectedPatientId);
    } catch {
      setError("No se pudo registrar el cobro.");
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
