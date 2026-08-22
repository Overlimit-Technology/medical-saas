"use client";

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
  patientName: string;
  doctorName: string;
  clinicLogo?: string | null;
  includeLogo?: boolean;
};

function formatValue(value: string, fieldType: string): string {
  if (!value) return "—";
  if (fieldType === "BOOLEAN") return value === "true" ? "Sí" : "No";
  return value;
}

function SignaturePlaceholder({ label, name }: { label: string; name?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 pt-2">
      <div className="flex h-12 w-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      {name && <p className="text-[10px] text-slate-500">{name}</p>}
      <p className="text-[9px] text-slate-400">Nombre: ___________________________</p>
      <p className="text-[9px] text-slate-400">Fecha: ____________________________</p>
    </div>
  );
}

export default function RecordPreview({
  templateName,
  fields,
  values,
  patientName,
  doctorName,
  clinicLogo,
  includeLogo = true,
}: Props) {
  const sortedFields = [...fields].sort((a, b) => a.position - b.position);
  const regularFields = sortedFields.filter((f) => f.fieldType !== "SIGNATURE");
  const signatureFields = sortedFields.filter((f) => f.fieldType === "SIGNATURE");

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
              {includeLogo && (
                <div className="flex justify-center">
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="Logo" className="h-14 max-w-[144px] object-contain" />
                  ) : (
                    <div className="flex h-14 w-36 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                      <span className="text-[10px] text-slate-400">Logo Clínica</span>
                    </div>
                  )}
                </div>
              )}

              <h3 className="text-center text-base font-bold text-slate-900">
                {templateName}
              </h3>

              <hr className="border-slate-200" />

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

              <div className="space-y-3">
                {regularFields.map((field) => (
                  <div key={getFieldKey(field)}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {field.label}
                    </p>
                    <p className="text-xs text-slate-800">
                      {formatValue(values[getFieldKey(field)] ?? "", field.fieldType)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer area */}
            <div className="mt-6 space-y-4">
              <hr className="border-slate-200" />

              {signatureFields.length > 0 ? (
                <div className={`flex ${signatureFields.length > 1 ? "justify-around" : "justify-center"} gap-4 pt-2`}>
                  {signatureFields.map((field) => (
                    <SignaturePlaceholder
                      key={getFieldKey(field)}
                      label={field.label || (field.options === "doctor" ? "Firma del Profesional" : "Firma del Paciente")}
                      name={field.options === "doctor" ? doctorName : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 pt-2">
                  <div className="flex h-12 w-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                    <span className="text-[10px] text-slate-400">
                      Firma del Doctor
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{doctorName}</p>
                </div>
              )}

              <p className="text-center text-[8px] text-slate-300">
                Generado el {new Date().toLocaleString("es-CL")} — Página 1 de 1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
