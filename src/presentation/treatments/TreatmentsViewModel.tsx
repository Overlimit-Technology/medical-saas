"use client";

import { useEffect, useMemo, useState } from "react";

export type Treatment = {
  id: string;
  name: string;
  price: number;
};

export type FormState = {
  name: string;
  price: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Nombre obligatorio.";
  if (!form.price.trim()) {
    errors.price = "Precio obligatorio.";
  } else {
    const parsed = Number(form.price);
    if (Number.isNaN(parsed)) {
      errors.price = "Precio inválido.";
    } else if (parsed < 0) {
      errors.price = "El precio debe ser mayor o igual a 0.";
    }
  }
  return errors;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function useTreatmentsViewModel() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Treatment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter(
      (item) => item.name.toLowerCase().includes(term)
    );
  }, [items, query]);

  const totalLabel = `${items.length} tratamiento${items.length === 1 ? "" : "s"}`;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const loadRole = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      setRole(data.ok ? data.session?.role ?? null : null);
    } catch {
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  const loadTreatments = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/treatments");
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudieron cargar los tratamientos.");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setApiError("No se pudieron cargar los tratamientos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRole();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "ADMIN" && role !== "DOCTOR") {
      window.location.assign("/dashboard");
      return;
    }
    loadTreatments();
  }, [role, roleLoading]);

  const openCreateModal = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (treatment: Treatment) => {
    setSelected(treatment);
    setForm({
      name: treatment.name,
      price: `${treatment.price}`,
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
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      const next = { ...errors };
      delete next[key];
      setErrors(next);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
    };

    const editing = Boolean(selected);
    const endpoint = editing ? `/api/treatments/${selected!.id}` : "/api/treatments";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar el tratamiento.");
        return;
      }
      closeModal();
      setSuccessMessage(editing ? "Tratamiento actualizado." : "Tratamiento creado.");
      await loadTreatments();
    } catch {
      setApiError("No se pudo guardar el tratamiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/treatments/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar el tratamiento.");
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage("Tratamiento eliminado.");
      await loadTreatments();
    } catch {
      setDeleteError("No se pudo eliminar el tratamiento.");
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const hasAccess = role === "ADMIN" || role === "DOCTOR";

  return {
    state: {
      items,
      query,
      selected,
      filteredItems,
      form,
      errors,
      roleLoading,
      loading,
      saving,
      apiError,
      successMessage,
      hasAccess,
      isModalOpen,
      deleteTarget,
      deleteError,
      totalLabel,
      headerHint,
      isSubmitDisabled,
    },
    actions: {
      setQuery,
      openCreateModal,
      openEditModal,
      closeModal,
      handleFieldChange,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
    },
  };
}
