"use client";

/**
 * Recepcion deja elegido el tipo de atencion al agendar (opcional). El profesional lo vera marcado
 * como "Elegida en recepcion" y siempre puede cambiarlo al abrir la cita.
 */
import { useEffect, useState } from "react";
import type { AttentionTypeDef } from "@/lib/clinical/attentionTypes";

type Props = {
  doctorId: string;
  value: string;
  onChange: (key: string) => void;
};

type Listed = AttentionTypeDef & { hidden: boolean };

export default function AttentionTypeSelect({ doctorId, value, onChange }: Props) {
  const [types, setTypes] = useState<Listed[] | null>(null);

  useEffect(() => {
    if (!doctorId) {
      setTypes(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/attention-types?doctorId=${encodeURIComponent(doctorId)}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; item?: { types: Listed[] } }) => {
        if (!cancelled) setTypes(data.ok && data.item ? data.item.types.filter((t) => !t.hidden) : []);
      })
      .catch(() => !cancelled && setTypes([]));
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  if (!doctorId || !types || types.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-500">Tipo de atencion <span className="font-normal text-slate-400">(opcional)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {types.map((type) => {
          const on = value === type.key;
          return (
            <button
              key={type.key}
              type="button"
              onClick={() => onChange(on ? "" : type.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${on ? "border-transparent bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:-translate-y-px hover:border-slate-300"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: type.color }} />
              {type.name}
              <span className={on ? "text-white/60" : "text-slate-400"}>{type.durationMinutes}m</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
