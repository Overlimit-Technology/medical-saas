"use client";

import { useState } from "react";
import RecordPreview from "./RecordPreview";

type FieldDef = {
  id?: string;
  label: string;
  fieldType: string;
  position: number;
  isRequired: boolean;
  options: string | null;
};

function getFieldKey(field: FieldDef) {
  return field.id ?? `${field.label}-${field.position}`;
}

type Props = {
  templateName: string;
  fields: FieldDef[];
  values: Record<string, string>;
  saving: boolean;
  apiError: string | null;
  isEdit: boolean;
  patientName: string;
  doctorName: string;
  clinicLogo?: string | null;
  includeLogo?: boolean;
  onFieldChange: (fieldId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export default function ClinicalRecordForm({
  templateName,
  fields,
  values,
  saving,
  apiError,
  isEdit,
  patientName,
  doctorName,
  clinicLogo,
  includeLogo = true,
  onFieldChange,
  onSubmit,
  onCancel,
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {isEdit ? "Editar ficha" : "Nueva ficha"}: {templateName}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={() => setShowPreview((p) => !p)}
            className="rounded"
          />
          Previsualización
        </label>
      </div>

      <div className={`mt-4 ${showPreview ? "flex gap-6 items-start" : ""}`}>
        <form onSubmit={onSubmit} className={`grid gap-4 ${showPreview ? "w-1/2 min-w-0" : "w-full"}`}>
          {sortedFields.map((field) => (
            <div key={getFieldKey(field)}>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {field.label}
                {field.isRequired && <span className="text-rose-400"> *</span>}
              </label>
              {renderField(field, values[getFieldKey(field)] ?? "", onFieldChange)}
            </div>
          ))}

          {apiError && (
            <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {apiError}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
            >
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
        {showPreview && (
          <div className="w-1/2 min-w-0">
            <RecordPreview
              templateName={templateName}
              fields={fields}
              values={values}
              patientName={patientName}
              doctorName={doctorName}
              clinicLogo={clinicLogo}
              includeLogo={includeLogo}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function renderField(
  field: FieldDef,
  value: string,
  onChange: (fieldId: string, value: string) => void
) {
  const fieldId = field.id ?? `${field.label}-${field.position}`;
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400";

  switch (field.fieldType) {
    case "TEXTAREA":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          rows={3}
          className={inputClass}
        />
      );
    case "NUMBER":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          className={inputClass}
        />
      );
    case "DATE":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          className={inputClass}
        />
      );
    case "BOOLEAN":
      return (
        <select
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          className={inputClass}
        >
          <option value="">— Seleccionar —</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      );
    case "SELECT": {
      const options = (field.options ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      return (
        <select
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          className={inputClass}
        >
          <option value="">— Seleccionar —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(fieldId, e.target.value)}
          className={inputClass}
        />
      );
  }
}
