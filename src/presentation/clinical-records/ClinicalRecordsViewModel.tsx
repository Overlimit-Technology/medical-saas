"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClinicalRecordsRepositoryHttp } from "@/data/clinical-records/ClinicalRecordsRepository";
import { FormTemplatesRepositoryHttp } from "@/data/form-templates/FormTemplatesRepository";
import type { ClinicalRecord } from "@/domain/clinical-records/entities/ClinicalRecord";
import {
  GetClinicalRecordsUseCase,
  GetClinicalRecordsByPatientUseCase,
  SaveClinicalRecordUseCase,
} from "@/domain/clinical-records/usecases/ClinicalRecordsUseCases";
import type { FormTemplate } from "@/domain/form-templates/entities/FormTemplate";
import { GetFormTemplatesUseCase } from "@/domain/form-templates/usecases/FormTemplatesUseCases";
import { useClinicBranding } from "@/presentation/common/useClinicBranding";

export type { ClinicalRecord };
export type TemplateOption = FormTemplate;

type ValueMap = Record<string, string>;

function getTemplateFieldKey(field: FormTemplate["fields"][number]) {
  return field.id ?? `${field.label}-${field.position}`;
}

export function useClinicalRecordsViewModel(patientId: string, appointmentId?: string | null) {
  const { logoUrl: clinicLogo } = useClinicBranding();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null);
  const [values, setValues] = useState<ValueMap>({});

  const {
    getClinicalRecordsUseCase,
    getClinicalRecordsByPatientUseCase,
    saveClinicalRecordUseCase,
    getFormTemplatesUseCase,
  } = useMemo(() => {
    const clinicalRecordsRepo = new ClinicalRecordsRepositoryHttp();
    const formTemplatesRepo = new FormTemplatesRepositoryHttp();
    return {
      getClinicalRecordsUseCase: new GetClinicalRecordsUseCase(clinicalRecordsRepo),
      getClinicalRecordsByPatientUseCase: new GetClinicalRecordsByPatientUseCase(clinicalRecordsRepo),
      saveClinicalRecordUseCase: new SaveClinicalRecordUseCase(clinicalRecordsRepo),
      getFormTemplatesUseCase: new GetFormTemplatesUseCase(formTemplatesRepo),
    };
  }, []);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  const loadRecords = useCallback(async () => {
    try {
      const data = appointmentId
        ? await getClinicalRecordsUseCase.execute(appointmentId)
        : await getClinicalRecordsByPatientUseCase.execute(patientId);
      setRecords(data);
    } catch {
      setRecords([]);
    }
  }, [appointmentId, patientId, getClinicalRecordsUseCase, getClinicalRecordsByPatientUseCase]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await getFormTemplatesUseCase.execute("REPORT"));
    } catch {
      setTemplates([]);
    }
  }, [getFormTemplatesUseCase]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadRecords(), loadTemplates()]);
      setLoading(false);
    };
    void load();
  }, [loadRecords, loadTemplates]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const openCreateForm = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setEditingRecord(null);
    const initial: ValueMap = {};
    for (const field of template.fields) {
      initial[getTemplateFieldKey(field)] = "";
    }
    setValues(initial);
    setApiError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (record: ClinicalRecord) => {
    setSelectedTemplateId(record.template.id);
    setEditingRecord(record);
    const initial: ValueMap = {};
    for (const value of record.values) {
      initial[value.fieldId] = value.value;
    }

    const template = templates.find((item) => item.id === record.template.id);
    if (template) {
      for (const field of template.fields) {
        const fieldKey = getTemplateFieldKey(field);
        if (!(fieldKey in initial)) initial[fieldKey] = "";
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
    setValues((previous) => ({ ...previous, [fieldId]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    for (const field of selectedTemplate.fields) {
      const fieldKey = getTemplateFieldKey(field);
      if (field.isRequired && field.fieldType !== "VARIABLE" && field.fieldType !== "SIGNATURE") {
        if (!(values[fieldKey] ?? "").trim()) {
          setApiError(`El campo "${field.label}" es obligatorio.`);
          return;
        }
      }
    }

    setSaving(true);
    setApiError(null);

    try {
      await saveClinicalRecordUseCase.execute({
        recordId: editingRecord?.id,
        appointmentId: editingRecord ? undefined : (appointmentId ?? undefined),
        templateId: editingRecord ? undefined : selectedTemplateId,
        patientId: editingRecord ? undefined : patientId,
        values: Object.entries(values).map(([fieldId, value]) => ({ fieldId, value })),
      });

      closeForm();
      setSuccessMessage(editingRecord ? "Ficha actualizada." : "Ficha creada.");
      await loadRecords();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
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
      clinicLogo,
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
