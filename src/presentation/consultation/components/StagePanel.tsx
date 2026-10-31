"use client";

import type { ConsultationStageMeta } from "../consultation.constants";

type Props = {
  stage: ConsultationStageMeta;
  /** Contenido a la derecha del titulo: contadores, atajos de la etapa. */
  aside?: React.ReactNode;
  children: React.ReactNode;
};

/** Encabezado comun de cada etapa. La animacion la dispara la clave de etapa. */
export default function StagePanel({ stage, aside, children }: Props) {
  const Icon = stage.icon;

  return (
    <section key={stage.key} className="animate-stage-in">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#50c9d5]/10 text-[#1e737b]">
            <Icon size={17} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-slate-900">{stage.label}</h2>
            <p className="mt-0.5 text-sm text-slate-400">{stage.caption}</p>
          </div>
        </div>
        {aside}
      </div>

      {children}
    </section>
  );
}
