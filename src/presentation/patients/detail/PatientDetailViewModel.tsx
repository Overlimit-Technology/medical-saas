"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatRun } from "../PatientsViewModel";

export type PatientAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  doctor: {
    profile?: { firstName: string; lastName: string } | null;
  };
};

export type PatientDetail = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  createdAt: string;
  appointments?: PatientAppointment[];
};

export type EditableFields = {
  firstName: string;
  lastName: string;
  secondLastName: string;
  phone: string;
  run: string;
  gender: string;
  birthDate: string;
  address: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
};

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function usePatientDetailViewModel() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());

  const [form, setForm] = useState<EditableFields>({
    firstName: "",
    lastName: "",
    secondLastName: "",
    phone: "",
    run: "",
    gender: "",
    birthDate: "",
    address: "",
    city: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    email: "",
  });

  const populateForm = useCallback((p: PatientDetail) => {
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      secondLastName: p.secondLastName ?? "",
      phone: p.phone ?? "",
      run: p.run,
      gender: p.gender ?? "",
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : "",
      address: p.address ?? "",
      city: p.city ?? "",
      emergencyContactName: p.emergencyContactName ?? "",
      emergencyContactPhone: p.emergencyContactPhone ?? "",
      email: p.email ?? "",
    });
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        setRole(data.ok ? data.session?.role ?? null : null);
      } catch {
        setRole(null);
      }
    };
    loadRole();
  }, []);

  const loadPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();
      if (data.ok && data.item) {
        setPatient(data.item);
        populateForm(data.item);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id, populateForm]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const isAdmin = role === "ADMIN";
  const canEdit = role === "ADMIN" || role === "SECRETARY";

  const age = useMemo(() => computeAge(patient?.birthDate), [patient?.birthDate]);

  const fileNumber = useMemo(() => {
    if (!patient) return "";
    const date = new Date(patient.createdAt);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const short = patient.id.slice(-4).toUpperCase();
    return `${y}${m}${d}-${short}`;
  }, [patient]);

  const filteredAppointments = useMemo(() => {
    if (!patient?.appointments) return [];
    return patient.appointments.filter((a) => {
      const year = new Date(a.startAt).getFullYear();
      return year === historyYear;
    });
  }, [patient?.appointments, historyYear]);

  const availableYears = useMemo(() => {
    if (!patient?.appointments?.length) return [new Date().getFullYear()];
    const years = new Set(patient.appointments.map((a) => new Date(a.startAt).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [patient?.appointments]);

  const handleFieldChange = (key: keyof EditableFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEditing = () => {
    if (!canEdit || !patient) return;
    populateForm(patient);
    setEditing(true);
    setApiError(null);
  };

  const cancelEditing = () => {
    if (patient) populateForm(patient);
    setEditing(false);
    setApiError(null);
  };

  const saveChanges = async () => {
    if (!canEdit || !patient) return;
    setSaving(true);
    setApiError(null);

    const payload: Record<string, string | null> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      secondLastName: form.secondLastName.trim() || null,
      phone: form.phone.trim() || null,
      run: formatRun(form.run),
      gender: form.gender.trim() || null,
      birthDate: form.birthDate || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      emergencyContactName: form.emergencyContactName.trim() || null,
      emergencyContactPhone: form.emergencyContactPhone.trim() || null,
      email: form.email.trim() || null,
    };

    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar.");
        return;
      }
      setEditing(false);
      setSuccessMessage("Paciente actualizado.");
      await loadPatient();
    } catch {
      setApiError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !deleteConfirmChecked) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar.");
        return;
      }
      router.push("/patients");
    } catch {
      setDeleteError("No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const goBack = () => router.push("/patients");

  return {
    state: {
      patient,
      loading,
      role,
      isAdmin,
      canEdit,
      editing,
      saving,
      form,
      apiError,
      successMessage,
      age,
      fileNumber,
      filteredAppointments,
      availableYears,
      historyYear,
      deleteConfirmChecked,
      deleting,
      deleteError,
    },
    actions: {
      handleFieldChange,
      startEditing,
      cancelEditing,
      saveChanges,
      handleDelete,
      setDeleteConfirmChecked,
      setHistoryYear,
      goBack,
    },
  };
}
