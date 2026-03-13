"use client";

import { useEffect, useMemo, useState } from "react";

export type Treatment = {
  id: string;
  name: string;
  price: number;
};

export type FormState = {
  id: string;
  name: string;
  price: string;
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  price: "",
};

function validateForm(form: FormState, editing: boolean) {
  const errors: FormErrors = {};
  if (!editing && !form.id.trim()) {
    errors.id = "Id obligatorio.";
  }
  if (!form.name.trim()) {
    errors.name = "Nombre obligatorio.";
  }
  if (!form.price.trim()) {
    errors.price = "Precio obligatorio.";
  } else {
    const parsedPrice = Number(form.price);
    if (Number.isNaN(parsedPrice)) {
      errors.price = "Precio invalido.";
    } else if (parsedPrice < 0) {
      errors.price = "El precio debe ser mayor o igual a 0.";
    }
  }
  return errors;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function useTreatmentsViewModel() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTreatment = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter(
      (item) => item.id.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)
    );
  }, [items, query]);

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

  useEffect(() => {
    if (selectedTreatment) {
      setForm({
        id: selectedTreatment.id,
        name: selectedTreatment.name,
        price: `${selectedTreatment.price}`,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setApiError(null);
  }, [selectedTreatment]);

  const handleFieldChange = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (!errors[key]) return;
    const next = { ...errors };
    delete next[key];
    setErrors(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const editing = Boolean(selectedTreatment);
    const nextErrors = validateForm(form, editing);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editing) {
      const confirmed = window.confirm("Confirma guardar cambios de este tratamiento.");
      if (!confirmed) return;
    }

    setSaving(true);
    setApiError(null);

    const payload = editing
      ? {
          name: form.name.trim(),
          price: Number(form.price),
        }
      : {
          id: form.id.trim(),
          name: form.name.trim(),
          price: Number(form.price),
        };

    const endpoint = editing ? `/api/treatments/${selectedTreatment?.id}` : "/api/treatments";
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

      setSuccessMessage(editing ? "Tratamiento actualizado." : "Tratamiento creado.");
      setSelectedId(null);
      setForm(EMPTY_FORM);
      await loadTreatments();
    } catch {
      setApiError("No se pudo guardar el tratamiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Treatment) => {
    const confirmed = window.confirm(
      `Confirma eliminar el tratamiento "${item.name}". Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setApiError(null);

    try {
      const res = await fetch(`/api/treatments/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo eliminar el tratamiento.");
        return;
      }

      if (selectedId === item.id) {
        setSelectedId(null);
      }
      setSuccessMessage("Tratamiento eliminado.");
      await loadTreatments();
    } catch {
      setApiError("No se pudo eliminar el tratamiento.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasAccess = role === "ADMIN" || role === "DOCTOR";

  return {
    state: {
      items,
      query,
      selectedTreatment,
      filteredItems,
      form,
      errors,
      role,
      roleLoading,
      loading,
      saving,
      deletingId,
      apiError,
      successMessage,
      hasAccess,
    },
    actions: {
      setQuery,
      setSelectedId,
      handleFieldChange,
      handleSubmit,
      handleDelete,
    },
  };
}
