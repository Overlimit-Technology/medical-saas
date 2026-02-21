"use client";

import { useEffect, useMemo, useState } from "react";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
};

type Treatment = {
  id: string;
  name: string;
  price: number;
};

type PaymentHistoryItem = {
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

type FormState = {
  treatmentId: string;
  recordedAt: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: string;
  notes: string;
};

const STATUS_LABEL: Record<PaymentHistoryItem["status"], string> = {
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

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-CL");
}

function formatClp(value: number) {
  return `${new Intl.NumberFormat("es-CL").format(Math.round(value))} CLP`;
}

function fullName(patient: Patient | null) {
  if (!patient) return "";
  return [patient.firstName, patient.lastName, patient.secondLastName ?? ""].join(" ").trim();
}

export default function CrmPage() {
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

  const currentTreatment = treatments.find((item) => item.id === form.treatmentId) ?? null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando Gestion de contactos y cobros...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Gestion de contactos y cobros</p>
            <h1 className="text-2xl font-semibold text-slate-900">Gestion de contactos y cobros</h1>
            {selectedPatient && (
              <p className="mt-2 text-sm text-slate-600">
                Cobros y pagos del paciente <span className="font-semibold">{fullName(selectedPatient)}</span> - RUN{" "}
                <span className="font-semibold">{selectedPatient.run}</span>
              </p>
            )}
          </div>
          <div className="w-full max-w-sm">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Paciente
            </label>
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {patients.length === 0 && <option value="">Sin pacientes</option>}
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {fullName(patient)} - {patient.run}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">FECHA</th>
                <th className="px-2 py-2 font-medium">TRATAMIENTO</th>
                <th className="px-2 py-2 font-medium">PRECIO</th>
                <th className="px-2 py-2 font-medium">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-slate-400">
                    Cargando historial...
                  </td>
                </tr>
              )}
              {!historyLoading && history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-slate-400">
                    Sin registros de cobros/pagos para este paciente.
                  </td>
                </tr>
              )}
              {!historyLoading &&
                history.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-2 py-3 text-slate-700">{formatDateLabel(row.recordedAt)}</td>
                    <td className="px-2 py-3 font-medium text-slate-900">{row.treatment.name}</td>
                    <td className="px-2 py-3 text-slate-700">{formatClp(row.amount)}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.status === "WAIVED"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registrar cobro</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Tratamiento</label>
            <select
              value={form.treatmentId}
              onChange={(event) => {
                const treatmentId = event.target.value;
                const treatment = treatments.find((item) => item.id === treatmentId);
                setForm((prev) => ({
                  ...prev,
                  treatmentId,
                  amount: treatment ? `${Math.round(treatment.price)}` : prev.amount,
                }));
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Fecha</label>
            <input
              type="date"
              value={form.recordedAt}
              onChange={(event) => setForm((prev) => ({ ...prev, recordedAt: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Estado</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as FormState["status"],
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="PENDING">Pendiente</option>
              <option value="PAID">Pagado</option>
              <option value="WAIVED">Exento</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Monto (CLP)</label>
            <input
              type="number"
              min={1}
              step="1"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={currentTreatment ? `${Math.round(currentTreatment.price)}` : "0"}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Notas (opcional)</label>
            <input
              type="text"
              value={form.notes}
              maxLength={250}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Detalle breve del cobro"
            />
          </div>

          <div className="md:col-span-1 md:self-end">
            <button
              type="submit"
              disabled={saving || !selectedPatientId || !form.treatmentId}
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
