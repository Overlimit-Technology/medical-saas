"use client";

import { useEffect, useMemo, useState } from "react";

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

export type FormState = {
  firstName: string;
  lastName: string;
  secondLastName: string;
  run: string;
  email: string;
  phone: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  run: "",
  email: "",
  phone: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;

function normalizeRun(value: string) {
  return value.replace(/\./g, "").replace(/-/g, "").toUpperCase();
}

export function formatRun(value: string) {
  const clean = normalizeRun(value);
  if (clean.length < 2) return value.toUpperCase();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

function isValidRun(value: string) {
  const clean = normalizeRun(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? "0" : mod === 10 ? "K" : `${mod}`;
  return dv === expected;
}

function validateForm(form: FormState) {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Nombre obligatorio.";
  if (!form.lastName.trim()) errors.lastName = "Apellido obligatorio.";
  if (!form.run.trim()) {
    errors.run = "RUN obligatorio.";
  } else if (!isValidRun(form.run)) {
    errors.run = "RUN inválido. Ej: 12.345.678-5";
  }
  if (form.email && !emailRegex.test(form.email)) {
    errors.email = "Correo inválido.";
  }
  if (form.phone && !phoneRegex.test(form.phone)) {
    errors.phone = "Telefono invalido. Ej: +56 9 1234 5678";
  }
  return errors;
}

export function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function usePatientsViewModel() {
  const [items, setItems] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPatients = async (q?: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(
        `/api/patients?q=${encodeURIComponent(q ?? "")}&page=1&pageSize=200`
      );
      const data = await res.json();
      if (data.ok) {
        setItems(data.items ?? []);
        if (!q) {
          setTotalCount(data.total ?? data.items?.length ?? 0);
        }
      } else {
        setApiError(data.error ?? "No se pudieron cargar los pacientes.");
      }
    } catch {
      setApiError("No se pudieron cargar los pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const openCreateModal = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setSelected(patient);
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      secondLastName: patient.secondLastName ?? "",
      run: patient.run,
      email: patient.email ?? "",
      phone: patient.phone ?? "",
    });
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
  };

  const handleFieldChange = (key: keyof FormState, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (errors[key]) {
      const nextErrors = { ...errors };
      delete nextErrors[key];
      setErrors(nextErrors);
    }
  };

  const handleRunBlur = () => {
    setForm((prev) => ({ ...prev, run: formatRun(prev.run) }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      secondLastName: form.secondLastName.trim() || null,
      run: formatRun(form.run),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    };

    try {
      const res = await fetch(selected ? `/api/patients/${selected.id}` : "/api/patients", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar el paciente.");
        return;
      }
      const savedMessage = selected
        ? "Paciente actualizado exitosamente."
        : "Paciente guardado exitosamente.";
      closeModal();
      setSuccessMessage(
        data.notificationWarning
          ? `${savedMessage} Aviso: ${data.notificationWarning}`
          : savedMessage
      );
      await loadPatients(query);
    } catch {
      setApiError("No se pudo guardar el paciente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar el paciente.");
        return;
      }
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage(
        data.softDeleted
          ? "Paciente desactivado."
          : data.deletedAppointments > 0
            ? "Paciente eliminado y citas pasadas removidas de agenda."
            : "Paciente eliminado."
      );
      await loadPatients(query);
    } catch {
      setDeleteError("No se pudo eliminar el paciente.");
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const totalLabel = `${totalCount} paciente${totalCount === 1 ? "" : "s"}`;
  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${items.length} resultado${items.length === 1 ? "" : "s"} para "${query}"`;
  }, [items.length, query]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    loadPatients(value);
  };

  return {
    state: {
      items,
      selected,
      loading,
      saving,
      query,
      form,
      errors,
      successMessage,
      apiError,
      deleteTarget,
      deleteError,
      totalCount,
      isModalOpen,
      totalLabel,
      isSubmitDisabled,
      headerHint,
    },
    actions: {
      openCreateModal,
      openEditModal,
      closeModal,
      handleFieldChange,
      handleRunBlur,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
      handleSearchChange,
    },
  };
}
