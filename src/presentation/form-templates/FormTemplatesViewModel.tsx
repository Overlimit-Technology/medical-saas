"use client";

import { useEffect, useMemo, useState } from "react";

export type FieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "TEXTAREA" | "BOOLEAN";

export type TemplateField = {
  id?: string;
  label: string;
  fieldType: FieldType;
  position: number;
  isRequired: boolean;
  options: string | null;
  defaultValue: string | null;
};

export type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  fields: TemplateField[];
  _count: { clinicalRecords: number };
};

export type FormState = {
  name: string;
  description: string;
  fields: TemplateField[];
};

export type FormErrors = Partial<Record<"name" | "fields", string>>;

const EMPTY_FIELD: TemplateField = {
  label: "",
  fieldType: "TEXT",
  position: 0,
  isRequired: false,
  options: null,
  defaultValue: null,
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  fields: [{ ...EMPTY_FIELD, position: 0 }],
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Nombre obligatorio.";
  if (form.fields.length === 0) {
    errors.fields = "Debe incluir al menos un campo.";
  } else {
    const hasEmpty = form.fields.some((f) => !f.label.trim());
    if (hasEmpty) errors.fields = "Todos los campos deben tener nombre.";
  }
  return errors;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Fecha",
  SELECT: "Selección",
  TEXTAREA: "Texto largo",
  BOOLEAN: "Sí/No",
};

export function useFormTemplatesViewModel() {
  const [items, setItems] = useState<FormTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FormTemplate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, query]);

  const totalLabel = `${items.length} plantilla${items.length === 1 ? "" : "s"}`;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const hasRecords = (selected?._count.clinicalRecords ?? 0) > 0;

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

  const loadTemplates = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/form-templates");
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudieron cargar las plantillas.");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setApiError("No se pudieron cargar las plantillas.");
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
    loadTemplates();
  }, [role, roleLoading]);

  const openCreateModal = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (template: FormTemplate) => {
    setSelected(template);
    setForm({
      name: template.name,
      description: template.description ?? "",
      fields: template.fields.map((f) => ({ ...f })),
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
    setShowPreview(false);
  };

  const handleFieldChange = (key: keyof Pick<FormState, "name" | "description">, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
    if (key === "name" && errors.name) {
      const next = { ...errors };
      delete next.name;
      setErrors(next);
    }
  };

  const addField = () => {
    setForm((c) => ({
      ...c,
      fields: [...c.fields, { ...EMPTY_FIELD, position: c.fields.length }],
    }));
  };

  const removeField = (index: number) => {
    setForm((c) => ({
      ...c,
      fields: c.fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i })),
    }));
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setForm((c) => ({
      ...c,
      fields: c.fields.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
    if (errors.fields) {
      const next = { ...errors };
      delete next.fields;
      setErrors(next);
    }
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    setForm((c) => {
      const fields = [...c.fields];
      if (target < 0 || target >= fields.length) return c;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...c, fields: fields.map((f, i) => ({ ...f, position: i })) };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const editing = Boolean(selected);
    const endpoint = editing ? `/api/form-templates/${selected!.id}` : "/api/form-templates";
    const method = editing ? "PATCH" : "POST";

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    };

    if (!editing || !hasRecords) {
      payload.fields = form.fields.map((f) => ({
        label: f.label.trim(),
        fieldType: f.fieldType,
        position: f.position,
        isRequired: f.isRequired,
        options: f.fieldType === "SELECT" ? f.options : null,
        defaultValue: f.defaultValue || null,
      }));
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar la plantilla.");
        return;
      }
      closeModal();
      setSuccessMessage(editing ? "Plantilla actualizada." : "Plantilla creada.");
      await loadTemplates();
    } catch {
      setApiError("No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/form-templates/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar la plantilla.");
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage("Plantilla eliminada.");
      await loadTemplates();
    } catch {
      setDeleteError("No se pudo eliminar la plantilla.");
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
      hasRecords,
      showPreview,
    },
    actions: {
      setQuery,
      openCreateModal,
      openEditModal,
      closeModal,
      handleFieldChange,
      addField,
      removeField,
      updateField,
      moveField,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
      togglePreview: () => setShowPreview((p) => !p),
    },
  };
}
