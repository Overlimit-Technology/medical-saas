"use client";

import { useEffect, useMemo, useState } from "react";

export type UserRole = "DOCTOR" | "SECRETARY";

export type Clinic = {
  id: string;
  name: string;
  city: string;
};

export type User = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  profile?: { firstName: string; lastName: string; rut?: string | null; phone?: string | null } | null;
  doctorProfile?: { rut: string; specialty?: string | null } | null;
};

export type FormState = {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  rut: string;
  specialty: string;
  clinicIds: string[];
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  email: "",
  role: "DOCTOR",
  firstName: "",
  lastName: "",
  rut: "",
  specialty: "",
  clinicIds: [],
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Nombre obligatorio.";
  if (!form.lastName.trim()) errors.lastName = "Apellido obligatorio.";
  if (!form.email.trim()) {
    errors.email = "Correo obligatorio.";
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Correo inválido.";
  }
  if (!form.rut.trim()) errors.rut = "RUN obligatorio.";
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
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function useDoctorsViewModel() {
  const [items, setItems] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items ?? []);
      } else {
        setApiError(data.error ?? "No se pudieron cargar los usuarios.");
      }
    } catch {
      setApiError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  const loadClinics = async () => {
    const res = await fetch("/api/clinics/my");
    const data = await res.json();
    if (!data.ok) return;
    setClinics(data.items ?? []);
    const preferredClinicId =
      data.activeClinicId ?? (data.items && data.items.length > 0 ? data.items[0].id : "");
    if (preferredClinicId) {
      setForm((current) => ({
        ...current,
        clinicIds: current.clinicIds.length > 0 ? current.clinicIds : [preferredClinicId],
      }));
    }
  };

  useEffect(() => {
    loadUsers();
    loadClinics();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM, clinicIds: form.clinicIds });
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ ...EMPTY_FORM, clinicIds: form.clinicIds });
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

  const toggleClinic = (clinicId: string) => {
    setForm((current) => {
      const isSelected = current.clinicIds.includes(clinicId);
      return {
        ...current,
        clinicIds: isSelected
          ? current.clinicIds.filter((id) => id !== clinicId)
          : [...current.clinicIds, clinicId],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const payload = {
      email: form.email.trim(),
      role: form.role,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      rut: form.rut.trim(),
      specialty: form.role === "DOCTOR" && form.specialty.trim() ? form.specialty.trim() : undefined,
      clinicIds: form.clinicIds.length > 0 ? form.clinicIds : undefined,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo crear el usuario.");
        return;
      }
      closeModal();
      setSuccessMessage("Usuario creado exitosamente.");
      await loadUsers();
    } catch {
      setApiError("No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar el usuario.");
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage(
        data.softDeleted
          ? "Usuario desactivado porque tiene citas futuras."
          : "Usuario eliminado."
      );
      await loadUsers();
    } catch {
      setDeleteError("No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => {
      const name = `${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`.toLowerCase();
      const email = u.email.toLowerCase();
      const rut = (u.doctorProfile?.rut ?? u.profile?.rut ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || rut.includes(q);
    });
  }, [items, query]);

  const totalLabel = `${items.length} usuario${items.length === 1 ? "" : "s"}`;
  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  return {
    state: {
      items: filteredItems,
      clinics,
      loading,
      saving,
      query,
      form,
      errors,
      apiError,
      successMessage,
      isModalOpen,
      deleteTarget,
      deleteError,
      deletingId,
      totalLabel,
      isSubmitDisabled,
      headerHint,
    },
    actions: {
      openCreateModal,
      closeModal,
      handleFieldChange,
      toggleClinic,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
      setQuery,
    },
  };
}
