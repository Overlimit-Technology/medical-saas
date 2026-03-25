"use client";

import { useEffect, useState, useCallback } from "react";

type FieldDef = {
  id: string;
  label: string;
  fieldType: string;
  position: number;
  isRequired: boolean;
  options: string | null;
};

type RecordValue = {
  id: string;
  fieldId: string;
  value: string;
  field: FieldDef;
};

export type ClinicalRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  template: { id: string; name: string };
  doctor: {
    id: string;
    profile?: { firstName: string; lastName: string } | null;
  };
  values: RecordValue[];
};

export type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  fields: FieldDef[];
};

type ValueMap = Record<string, string>;

export function useClinicalRecordsViewModel(appointmentId: string, patientId: string) {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null);
  const [values, setValues] = useState<ValueMap>({});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinical-records?appointmentId=${appointmentId}`);
      const data = await res.json();
      if (data.ok) setRecords(data.items ?? []);
    } catch {
      /* ignore */
    }
  }, [appointmentId]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/form-templates");
      const data = await res.json();
      if (data.ok) setTemplates(data.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadRecords(), loadTemplates()]);
      setLoading(false);
    };
    load();
  }, [loadRecords, loadTemplates]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const openCreateForm = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setSelectedTemplateId(templateId);
    setEditingRecord(null);
    const initial: ValueMap = {};
    for (const f of tmpl.fields) {
      initial[f.id] = "";
    }
    setValues(initial);
    setApiError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (record: ClinicalRecord) => {
    setSelectedTemplateId(record.template.id);
    setEditingRecord(record);
    const initial: ValueMap = {};
    for (const v of record.values) {
      initial[v.fieldId] = v.value;
    }
    // Fill any missing fields with empty string
    const tmpl = templates.find((t) => t.id === record.template.id);
    if (tmpl) {
      for (const f of tmpl.fields) {
        if (!(f.id in initial)) initial[f.id] = "";
      }
    }
    setValues(initial);
    setApiError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedTemplateId(null);
    setEditingRecord(null);
    setValues({});
    setApiError(null);
  };

  const setFieldValue = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    // Validate required fields
    for (const field of selectedTemplate.fields) {
      if (field.isRequired && !(values[field.id] ?? "").trim()) {
        setApiError(`El campo "${field.label}" es obligatorio.`);
        return;
      }
    }

    setSaving(true);
    setApiError(null);

    const valuesArray = Object.entries(values).map(([fieldId, value]) => ({
      fieldId,
      value,
    }));

    try {
      const editing = Boolean(editingRecord);
      const endpoint = editing
        ? `/api/clinical-records/${editingRecord!.id}`
        : "/api/clinical-records";
      const method = editing ? "PATCH" : "POST";

      const payload: Record<string, unknown> = { values: valuesArray };
      if (!editing) {
        payload.appointmentId = appointmentId;
        payload.templateId = selectedTemplateId;
        payload.patientId = patientId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar la ficha.");
        return;
      }

      closeForm();
      setSuccessMessage(editing ? "Ficha actualizada." : "Ficha creada.");
      await loadRecords();
    } catch {
      setApiError("No se pudo guardar la ficha.");
    } finally {
      setSaving(false);
    }
  };

  return {
    state: {
      records,
      templates,
      loading,
      saving,
      apiError,
      successMessage,
      isFormOpen,
      selectedTemplate,
      editingRecord,
      values,
    },
    actions: {
      openCreateForm,
      openEditForm,
      closeForm,
      setFieldValue,
      handleSubmit,
    },
  };
}
