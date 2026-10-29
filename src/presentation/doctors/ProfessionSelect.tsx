"use client";

import { useEffect, useState } from "react";

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
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange({ professionId: "", professionName: value.professionName });
          } else {
            setOther(false);
            onChange({ professionId: e.target.value, professionName: "" });
          }
        }}
        className={inputClass}
      >
        <option value="">Sin definir</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        <option value={OTHER}>Otra...</option>
      </select>
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
