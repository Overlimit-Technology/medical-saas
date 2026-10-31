"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/domain/leads/entities/Lead";

type Insight = {
  score: number | null;
  temperature: "HOT" | "WARM" | "COLD" | null;
  summary: string | null;
  nextAction: string | null;
  scoredAt: string | null;
};

const TEMPERATURE_LABEL = { HOT: "Caliente", WARM: "Tibio", COLD: "Frio" } as const;
const TEMPERATURE_STYLE = {
  HOT: "bg-rose-50 text-rose-600",
  WARM: "bg-amber-50 text-amber-700",
  COLD: "bg-sky-50 text-sky-700",
} as const;

function fromLead(lead: Lead): Insight {
  return {
    score: lead.aiScore ?? null,
    temperature: lead.aiTemperature ?? null,
    summary: lead.aiSummary ?? null,
    nextAction: lead.aiNextAction ?? null,
    scoredAt: lead.aiScoredAt ?? null,
  };
}

export default function LeadAiInsight({ lead }: { lead: Lead }) {
  const [insight, setInsight] = useState<Insight>(() => fromLead(lead));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar de lead se muestra su ultimo analisis guardado.
  useEffect(() => {
    setInsight(fromLead(lead));
    setError(null);
  }, [lead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/score-lead", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo analizar el lead.");
      setInsight({
        score: json.score.score,
        temperature: json.score.temperature,
        summary: json.score.summary,
        nextAction: json.score.nextAction,
        scoredAt: json.score.scoredAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el lead.");
    } finally {
      setLoading(false);
    }
  };

  const hasInsight = insight.score !== null && insight.temperature !== null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Analisis IA</p>
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={loading || lead.converted}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-[#50c9d5] hover:text-[#0f9ea8] disabled:opacity-50"
        >
          {loading ? "Analizando..." : hasInsight ? "Reanalizar" : "Analizar con IA"}
        </button>
      </div>

      {hasInsight && insight.temperature ? (
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TEMPERATURE_STYLE[insight.temperature]}`}>
              {TEMPERATURE_LABEL[insight.temperature]}
            </span>
            <span className="text-sm font-semibold tabular-nums text-slate-800">{insight.score}/100</span>
          </div>
          {insight.summary ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{insight.summary}</p> : null}
          {insight.nextAction ? (
            <p className="mt-2 text-xs font-medium text-slate-800">Siguiente paso: {insight.nextAction}</p>
          ) : null}
          {insight.scoredAt ? (
            <p className="mt-2 text-[10px] text-slate-400">
              Analizado el {new Date(insight.scoredAt).toLocaleDateString("es-CL")}. Es una sugerencia, no una decision.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Aun no se analiza. La IA estima la probabilidad de que este contacto agende y sugiere el siguiente paso.
        </p>
      )}

      {error ? <p className="mt-1.5 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
