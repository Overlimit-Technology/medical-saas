"use client";

import type { ClinicalRecord } from "./ClinicalRecordsViewModel";
import { exportRecordPdf } from "./exportRecordPdf";

type Props = {
  records: ClinicalRecord[];
  patientName: string;
  onEdit: (record: ClinicalRecord) => void;
};

export default function ClinicalRecordsList({ records, patientName, onEdit }: Props) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-slate-400">No hay fichas clínicas registradas para esta cita.</p>
    );
  }

  const handleExportPdf = (record: ClinicalRecord) => {
    const doctorName = record.doctor.profile
      ? `${record.doctor.profile.firstName} ${record.doctor.profile.lastName}`
      : "Doctor";

    const sortedValues = [...record.values].sort((a, b) => a.field.position - b.field.position);

    exportRecordPdf({
      templateName: record.template.name,
      patientName,
      doctorName,
      date: new Date(record.createdAt).toLocaleString("es-CL"),
      fields: sortedValues.map((v) => ({
        label: v.field.label,
        value: v.value,
        fieldType: v.field.fieldType,
      })),
    });
  };

  return (
    <div className="space-y-3">
      {records.map((record, idx) => {
        const doctorName = record.doctor.profile
          ? `${record.doctor.profile.firstName} ${record.doctor.profile.lastName}`
          : "Doctor";

        return (
          <div
            key={record.id}
            style={{ animationDelay: `${idx * 25}ms` }}
            className="animate-card-in cursor-pointer rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50/70"
            onClick={() => onEdit(record)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-800">{record.template.name}</h4>
                <p className="mt-0.5 text-xs text-slate-400">
                  {doctorName} &middot; {new Date(record.createdAt).toLocaleString("es-CL")}
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                  onClick={() => handleExportPdf(record)}
                >
                  PDF
                </button>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                  onClick={() => onEdit(record)}
                >
                  Editar
                </button>
              </div>
            </div>

            {record.values.length > 0 && (
              <div className="mt-3 grid gap-1.5 text-sm">
                {record.values
                  .sort((a, b) => a.field.position - b.field.position)
                  .slice(0, 4)
                  .map((v) => (
                    <div key={v.id} className="flex gap-2">
                      <span className="text-slate-400">{v.field.label}:</span>
                      <span className="text-slate-700">{formatValue(v.value, v.field.fieldType)}</span>
                    </div>
                  ))}
                {record.values.length > 4 && (
                  <p className="text-xs text-slate-400">+{record.values.length - 4} campos más</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatValue(value: string, fieldType: string): string {
  if (fieldType === "BOOLEAN") return value === "true" ? "Sí" : "No";
  return value;
}
