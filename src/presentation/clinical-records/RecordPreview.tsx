"use client";

type FieldDef = {
  id: string;
  label: string;
  fieldType: string;
  position: number;
  isRequired: boolean;
  options: string | null;
};

type Props = {
  templateName: string;
  fields: FieldDef[];
  values: Record<string, string>;
  patientName: string;
  doctorName: string;
};

function formatValue(value: string, fieldType: string): string {
  if (!value) return "—";
  if (fieldType === "BOOLEAN") return value === "true" ? "Sí" : "No";
  return value;
}

export default function RecordPreview({
  templateName,
  fields,
  values,
  patientName,
  doctorName,
}: Props) {
  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div className="sticky top-0">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Vista previa PDF
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-3">
        <div
          className="rounded-lg bg-white p-6 shadow-sm"
          style={{ minHeight: "480px" }}
        >
          <div
            className="flex flex-col justify-between"
            style={{ minHeight: "460px" }}
          >
            {/* Content */}
            <div className="space-y-4">
              {/* Clinic logo placeholder */}
              <div className="flex justify-center">
                <div className="flex h-14 w-36 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                  <span className="text-[10px] text-slate-400">
                    Logo Clínica
                  </span>
                </div>
              </div>

              {/* Template name */}
              <h3 className="text-center text-base font-bold text-slate-900">
                {templateName}
              </h3>

              <hr className="border-slate-200" />

              {/* Patient / Doctor info */}
              <div className="space-y-0.5 text-[11px] text-slate-500">
                <p>
                  <span className="font-semibold text-slate-600">
                    Paciente:
                  </span>{" "}
                  {patientName}
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Doctor:</span>{" "}
                  {doctorName}
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Fecha:</span>{" "}
                  {new Date().toLocaleDateString("es-CL")}
                </p>
              </div>

              <hr className="border-slate-200" />

              {/* Fields with real values */}
              <div className="space-y-3">
                {sortedFields.map((field) => (
                  <div key={field.id}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {field.label}
                    </p>
                    <p className="text-xs text-slate-800">
                      {formatValue(values[field.id] ?? "", field.fieldType)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer area */}
            <div className="mt-6 space-y-4">
              <hr className="border-slate-200" />

              {/* Doctor signature placeholder */}
              <div className="flex flex-col items-center gap-1 pt-2">
                <div className="flex h-12 w-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                  <span className="text-[10px] text-slate-400">
                    Firma del Doctor
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{doctorName}</p>
              </div>

              {/* Generated footer */}
              <p className="text-center text-[8px] text-slate-300">
                Generado el {new Date().toLocaleString("es-CL")} — Página 1 de
                1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
