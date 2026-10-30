"use client";

import { useEffect, useState } from "react";
import Select from "@/presentation/common/Select";

type ProfessionOption = { id: string; name: string; isGlobal: boolean };

export type ProfessionValue = { professionId: string; professionName: string };

const OTHER = "__other__";

/** Selector de profesion: catalogo + "Otra" (texto libre que crea una profesion propia de la sede). */
export function ProfessionSelect({
  value,
  onChange,
  className = "",
}: {
  value: ProfessionValue;
  onChange: (next: ProfessionValue) => void;
  className?: string;
}) {
  const [options, setOptions] = useState<ProfessionOption[]>([]);
  const [other, setOther] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/professions")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) setOptions(data.items ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectValue = other ? OTHER : value.professionId;
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className={className}>
      <Select
        value={selectValue}
        onChange={(next) => {
          if (next === OTHER) {
            setOther(true);
            onChange({ professionId: "", professionName: value.professionName });
          } else {
            setOther(false);
            onChange({ professionId: next, professionName: "" });
          }
        }}
        ariaLabel="Profesion"
        placeholder="Sin definir"
        searchPlaceholder="Buscar profesion..."
        emptyText="No hay profesiones que coincidan"
        options={[{ value: "", label: "Sin definir" }, ...options.map((option) => ({ value: option.id, label: option.name }))]}
        otherOption={{ value: OTHER, label: "Otra..." }}
      />
      {other && (
        <input
          value={value.professionName}
          onChange={(e) => onChange({ professionId: "", professionName: e.target.value })}
          placeholder="Nombre de la profesión"
          maxLength={60}
          className={`${inputClass} mt-2`}
        />
      )}
    </div>
  );
}
