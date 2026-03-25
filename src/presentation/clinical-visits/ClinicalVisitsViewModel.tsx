"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type Patient = { id: string; firstName: string; lastName: string };
export type Appointment = {
  id: string;
  startAt: string;
  status: string;
  patient: { id: string; firstName: string; lastName: string };
  box: { name: string };
};

export type ClinicalVisit = {
  id: string;
  startedAt: string;
  patient: { id: string; firstName: string; lastName: string };
  appointment?: { id: string; startAt: string } | null;
};

export function useClinicalVisitsViewModel() {
  const searchParams = useSearchParams();
  const qsAppointmentId = searchParams.get("appointmentId");
  const qsPatientId = searchParams.get("patientId");

  const [role, setRole] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [patientId, setPatientId] = useState(qsPatientId ?? "");
  const [appointmentId, setAppointmentId] = useState(qsAppointmentId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.ok) setRole(data.session?.role ?? null);
      } catch {
        setRole(null);
      }
    };
    loadSession();

    const loadPatients = async () => {
      const res = await fetch("/api/patients?pageSize=200");
      const data = await res.json();
      if (data.ok) setPatients(data.items ?? []);
    };

    const loadAppointments = async () => {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
      const data = await res.json();
      if (data.ok) setAppointments(data.items ?? []);
    };

    const loadVisits = async () => {
      const res = await fetch("/api/clinical-visits");
      const data = await res.json();
      if (data.ok) setVisits(data.items ?? []);
    };

    loadPatients();
    loadAppointments();
    loadVisits();
  }, []);

  useEffect(() => {
    if (!qsPatientId) return;
    setPatientId(qsPatientId);
  }, [qsPatientId]);

  useEffect(() => {
    if (!qsAppointmentId) return;
    setAppointmentId(qsAppointmentId);
  }, [qsAppointmentId]);

  const filteredAppointments = useMemo(() => {
    if (!patientId) return appointments;
    return appointments.filter((appt) => appt.patient.id === patientId);
  }, [appointments, patientId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (role !== "DOCTOR") {
      setError("Solo el rol Doctor puede iniciar una cita clínica.");
      return;
    }
    if (!patientId) {
      setError("Debes seleccionar un paciente para iniciar la cita clínica.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/clinical-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        appointmentId: appointmentId || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error ?? "No se pudo iniciar la cita clínica.");
      return;
    }

    setSuccess("Cita clínica iniciada y registrada.");
    setVisits((prev) => [data.item, ...prev]);
  };

  return {
    state: {
      role,
      patients,
      visits,
      patientId,
      appointmentId,
      filteredAppointments,
      loading,
      error,
      success,
    },
    actions: {
      setPatientId,
      setAppointmentId,
      handleSubmit,
    },
  };
}
