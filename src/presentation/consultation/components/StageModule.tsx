"use client";

import { useEffect, useRef } from "react";
import { History } from "lucide-react";
import type { ConsultationBootstrap, ConsultationDraft } from "@/domain/consultations/entities/Consultation";
import type { AttentionTypeDef } from "@/lib/clinical/attentionTypes";
import { riseIn } from "@/presentation/ui/fx";
import type { ConsultationStageMeta } from "../consultation.constants";
import AttentionFieldInput from "./AttentionFieldInput";
import StagePanel from "./StagePanel";

type Props = {
  stage: ConsultationStageMeta;
  type: AttentionTypeDef;
  bootstrap: ConsultationBootstrap;
  draft: ConsultationDraft;
  readOnly: boolean;
  onBlockChange: (id: string, value: string) => void;
};

/** Bloques del tipo de atencion, con el valor de la ultima vez al lado de cada medicion. */
export default function StageModule({ stage, type, bootstrap, draft, readOnly, onBlockChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => riseIn(ref.current?.querySelectorAll("[data-block]")), [type.key]);

  const carried = type.blocks.flatMap((b) => b.fields).filter((f) => f.carry && bootstrap.previousFields[f.id]);

  const copyPrevious = () => {
    for (const field of carried) {
      if (!draft.blocks?.[field.id]) onBlockChange(field.id, bootstrap.previousFields[field.id].value);
    }
  };

  return (
    <StagePanel
      stage={stage}
      aside={
        carried.length > 0 && !readOnly ? (
          <button type="button" onClick={copyPrevious} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-[#50c9d5]/50 hover:text-[#1e737b]">
            <History size={13} /> Copiar lo de la ultima vez
          </button>
        ) : null
      }
    >
      <div ref={ref} className="space-y-4">
        {type.blocks.map((block) => (
          <section key={block.id} data-block className="rounded-2xl border border-slate-100 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">{block.title}</h3>
            {block.description && <p className="mt-0.5 text-xs text-slate-400">{block.description}</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {block.fields.map((field) => (
                <AttentionFieldInput
                  key={field.id}
                  field={field}
                  value={draft.blocks?.[field.id] ?? ""}
                  previous={bootstrap.previousFields[field.id]}
                  readOnly={readOnly}
                  onChange={onBlockChange}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </StagePanel>
  );
}
