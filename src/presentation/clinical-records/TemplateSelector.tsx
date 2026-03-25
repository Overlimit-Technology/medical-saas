"use client";

import type { TemplateOption } from "./ClinicalRecordsViewModel";

type Props = {
  templates: TemplateOption[];
  onSelect: (templateId: string) => void;
};

export default function TemplateSelector({ templates, onSelect }: Props) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-slate-400">No hay plantillas disponibles.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          + {t.name}
        </button>
      ))}
    </div>
  );
}
