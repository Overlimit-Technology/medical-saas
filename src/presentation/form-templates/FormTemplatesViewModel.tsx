"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { FormTemplatesRepositoryHttp } from "@/data/form-templates/FormTemplatesRepository";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import type { FieldType, FormTemplate, TemplateField, TemplateType } from "@/domain/form-templates/entities/FormTemplate";
import { TEMPLATE_VARIABLES } from "@/domain/form-templates/entities/FormTemplate";
import {
  DeleteFormTemplateUseCase,
  GetFormTemplatesUseCase,
  SaveFormTemplateUseCase,
} from "@/domain/form-templates/usecases/FormTemplatesUseCases";

export type { FieldType, FormTemplate, TemplateField, TemplateType };
export { TEMPLATE_VARIABLES };

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
  } else if (form.fields.some((field) => !field.label.trim())) {
    errors.fields = "Todos los campos deben tener nombre.";
  } else if (
    form.fields.some(
      (field) => field.fieldType === "VARIABLE" && !field.options?.trim(),
    )
  ) {
    errors.fields = "Todas las variables automáticas deben tener una variable seleccionada.";
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
  SIGNATURE: "Firma",
  VARIABLE: "Variable automática",
};

export const TAB_LABELS: Record<TemplateType, string> = {
  REPORT: "Informes",
  CONSENT: "Consentimiento Informado",
  ATTENDANCE_CERTIFICATE: "Certificado de Asistencia",
};

export function useFormTemplatesViewModel() {
  const [reportItems, setReportItems] = useState<FormTemplate[]>([]);
  const [consentTemplate, setConsentTemplate] = useState<FormTemplate | null>(null);
  const [certificateTemplate, setCertificateTemplate] = useState<FormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateType>("REPORT");
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

  const {
    getCurrentSessionUseCase,
    getFormTemplatesUseCase,
    saveFormTemplateUseCase,
    deleteFormTemplateUseCase,
  } = useMemo(() => {
    const authRepo = new AuthRepositoryHttp();
    const repo = new FormTemplatesRepositoryHttp();
    return {
      getCurrentSessionUseCase: new GetCurrentSessionUseCase(authRepo),
      getFormTemplatesUseCase: new GetFormTemplatesUseCase(repo),
      saveFormTemplateUseCase: new SaveFormTemplateUseCase(repo),
      deleteFormTemplateUseCase: new DeleteFormTemplateUseCase(repo),
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return reportItems;
    const term = query.toLowerCase();
    return reportItems.filter((item) => item.name.toLowerCase().includes(term));
  }, [reportItems, query]);

  const totalLabel = `${reportItems.length} plantilla${reportItems.length === 1 ? "" : "s"}`;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;
  const hasRecords = (selected?._count.clinicalRecords ?? 0) > 0;

  const isAdminOnly = activeTab === "CONSENT" || activeTab === "ATTENDANCE_CERTIFICATE";
  const canEdit = role === "ADMIN" || (!isAdminOnly && role === "DOCTOR");

  const loadRole = useCallback(async () => {
    try {
      const session = await getCurrentSessionUseCase.execute();
      setRole(session.role);
    } catch {
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, [getCurrentSessionUseCase]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [reports, consents, certificates] = await Promise.all([
        getFormTemplatesUseCase.execute("REPORT"),
        getFormTemplatesUseCase.execute("CONSENT"),
        getFormTemplatesUseCase.execute("ATTENDANCE_CERTIFICATE"),
      ]);
      setReportItems(reports);
      setConsentTemplate(consents[0] ?? null);
      setCertificateTemplate(certificates[0] ?? null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudieron cargar las plantillas.");
    } finally {
      setLoading(false);
    }
  }, [getFormTemplatesUseCase]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

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
    void loadTemplates();
  }, [loadTemplates, role, roleLoading]);

  const openEditModal = (template: FormTemplate) => {
    setSelected(template);
    setForm({
      name: template.name,
      description: template.description ?? "",
      fields: template.fields.map((field) => ({ ...field })),
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
    setPendingTemplateType(null);
  };

  const [pendingTemplateType, setPendingTemplateType] = useState<TemplateType | null>(null);

  const openCreateModalForTab = (templateType: TemplateType) => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setPendingTemplateType(templateType);
    setIsModalOpen(true);
  };

  const handleFieldChange = (key: keyof Pick<FormState, "name" | "description">, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "name" && errors.name) {
      const next = { ...errors };
      delete next.name;
      setErrors(next);
    }
  };

  const addField = () => {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, { ...EMPTY_FIELD, position: current.fields.length }],
    }));
  };

  const removeField = (index: number) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.filter((_, i) => i !== index).map((field, i) => ({ ...field, position: i })),
    }));
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field, i) => {
        if (i !== index) return field;
        const updated = { ...field, ...updates };
        if (updates.fieldType && updates.fieldType !== "SELECT" && updates.fieldType !== "VARIABLE" && updates.fieldType !== "SIGNATURE") {
          updated.options = null;
        }
        if (updates.fieldType === "SIGNATURE" && !updated.options) {
          updated.options = "patient";
        }
        return updated;
      }),
    }));
    if (errors.fields) {
      const next = { ...errors };
      delete next.fields;
      setErrors(next);
    }
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    setForm((current) => {
      const fields = [...current.fields];
      if (target < 0 || target >= fields.length) return current;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields: fields.map((field, i) => ({ ...field, position: i })) };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const effectiveTemplateType: TemplateType = selected?.templateType ?? pendingTemplateType ?? activeTab;

    try {
      await saveFormTemplateUseCase.execute({
        id: selected?.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        templateType: selected ? undefined : effectiveTemplateType,
        fields:
          selected && hasRecords
            ? undefined
            : form.fields.map((field) => ({
                label: field.label.trim(),
                fieldType: field.fieldType,
                position: field.position,
                isRequired: field.isRequired,
                options: ["SELECT", "VARIABLE", "SIGNATURE"].includes(field.fieldType) ? field.options : null,
                defaultValue: field.defaultValue || null,
              })),
      });

      closeModal();
      setSuccessMessage(selected ? "Plantilla actualizada." : "Plantilla creada.");
      await loadTemplates();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteFormTemplateUseCase.execute(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage("Plantilla eliminada.");
      await loadTemplates();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar la plantilla.");
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const hasAccess = role === "ADMIN" || role === "DOCTOR";

  return {
    state: {
      reportItems,
      consentTemplate,
      certificateTemplate,
      activeTab,
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
      canEdit,
      isAdminOnly,
      pendingTemplateType,
      role,
    },
    actions: {
      setQuery,
      setActiveTab,
      openCreateModalForTab,
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
      togglePreview: () => setShowPreview((current) => !current),
    },
  };
}
