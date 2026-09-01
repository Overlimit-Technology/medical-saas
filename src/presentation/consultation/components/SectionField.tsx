"use client";

import { useEffect, useRef } from "react";
import { History, Lock } from "lucide-react";
import type { ConsultationSectionKey } from "@/domain/consultations/entities/Consultation";
import { CONSULTATION_SECTIONS } from "@/domain/consultations/entities/ConsultationCodes";

type Props = {
  sectionKey: ConsultationSectionKey;
  value: string;
  readOnly: boolean;
  /** El texto viene arrastrado de una consulta anterior y aun no se edita. */
  inherited?: boolean;
  /** Frases de un toque para no escribir lo mismo cada vez. */
  quickPhrases?: string[];
  onChange: (key: ConsultationSectionKey, value: string) => void;
};

/**
 * Campo narrativo de la consulta. Crece con el texto para que el profesional
 * nunca escriba dentro de una ventana de tres lineas.
 */
export default function SectionField({
  sectionKey,
  value,
  readOnly,
  inherited = false,
  quickPhrases,
  onChange,
}: Props) {
  const meta = CONSULTATION_SECTIONS[sectionKey];
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSingleLine = meta.rows === 1;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node || isSingleLine) return;

    node.style.height = "auto";
    node.style.height = `${Math.max(node.scrollHeight, meta.rows * 24 + 20)}px`;
  }, [value, meta.rows, isSingleLine]);

  const appendPhrase = (phrase: string) => {
    const separator = value.trim() ? (value.trim().endsWith(".") ? " " : ". ") : "";
    onChange(sectionKey, `${value.trim()}${separator}${phrase}`);
  };

  const fieldClassName =
    "w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 transition-all duration-200 placeholder:text-slate-300 focus:border-[#19b3bc] focus:outline-none focus:ring-2 focus:ring-[#19b3bc]/15 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="group">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label
          htmlFor={`section-${sectionKey}`}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
        >
          {meta.label}
        </label>

        {meta.isPrivate && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Lock size={10} /> Interna
          </span>
        )}

        {inherited && (
          <span className="animate-pop-in inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <History size={10} /> Heredado
          </span>
        )}

        {value.trim() && (
          <span className="ml-auto text-[11px] tabular-nums text-slate-300">
            {value.trim().length}
          </span>
        )}
      </div>

      <p className="mb-2 text-xs text-slate-400">{meta.hint}</p>

      {isSingleLine ? (
        <input
          id={`section-${sectionKey}`}
          type="text"
          value={value}
          disabled={readOnly}
          placeholder={meta.placeholder}
          onChange={(event) => onChange(sectionKey, event.target.value)}
          className={fieldClassName}
        />
      ) : (
        <textarea
          id={`section-${sectionKey}`}
          ref={textareaRef}
          value={value}
          rows={meta.rows}
          disabled={readOnly}
          placeholder={meta.placeholder}
          onChange={(event) => onChange(sectionKey, event.target.value)}
          className={`${fieldClassName} overflow-hidden`}
        />
      )}

      {quickPhrases && quickPhrases.length > 0 && !readOnly && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickPhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => appendPhrase(phrase)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-all duration-200 hover:-translate-y-px hover:border-[#19b3bc]/50 hover:text-[#0f8f98]"
            >
              + {phrase}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
