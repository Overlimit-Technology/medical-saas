"use client";

import type { CSSProperties, ReactNode } from "react";
import { CalendarCheck, HeartPulse, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { CountText } from "@/presentation/ui/motion";
import { useInfoBannerViewModel } from "./InfoBannerViewModel";

/** Tonos de Zensya para las cifras: turquesa, marino, aqua y turquesa oscuro. */
const TONES = {
  turquesa: { box: "bg-[#50c9d5] text-[#080b04]", glow: "rgba(80,201,213,.35)" },
  marino: { box: "bg-[#0d1b2a] text-white", glow: "rgba(13,27,42,.22)" },
  aqua: { box: "bg-[#84d9e1] text-[#0d1b2a]", glow: "rgba(132,217,225,.45)" },
  oscuro: { box: "bg-[#1e737b] text-white", glow: "rgba(30,115,123,.30)" },
} as const;

function StatTile({ icon: Icon, tone, label, index, children }: { icon: LucideIcon; tone: keyof typeof TONES; label: string; index: number; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <div
      className="zs-glass-inner zs-lift zs-in relative min-w-0 overflow-hidden rounded-[20px] p-4"
      style={{ "--i": index } as CSSProperties}
    >
      {/* Brillo del color de la cifra en la esquina */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: t.glow }} />
      <div className="relative flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,.35)] ${t.box}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <span className="text-[12.5px] font-medium text-slate-600">{label}</span>
      </div>
      <div className="relative mt-3">{children}</div>
    </div>
  );
}

export default function InfoBanner() {
  const { state } = useInfoBannerViewModel();
  const { data, loading, totalToday, progressPercent } = state;

  if (loading) {
    return (
      <div className="zs-glass animate-pulse rounded-[var(--radius-card)] px-6 py-5">
        <div className="h-24 rounded-xl bg-white/50" />
      </div>
    );
  }

  if (!data) return null;

  const isDoctor = data.mode === "doctor";

  return (
    <div className="zs-glass rounded-[var(--radius-card)] px-6 py-5">
      {/* Fila superior: identidad */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#50c9d5] text-lg font-bold text-[#080b04]">
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{data.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {isDoctor && (
                <>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    {data.specialty}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {data.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    {data.email}
                  </span>
                  {data.phone && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      {data.phone}
                    </span>
                  )}
                </>
              )}
              {!isDoctor && (
                <>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {data.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    {data.activeDoctors} doctores activos
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fila inferior: cifras con icono de color */}
      <div className="mt-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatTile icon={Users} tone="turquesa" label="Pacientes" index={0}>
          <b className="font-display text-[28px] font-bold leading-none tracking-[-1px] text-slate-900 tabular-nums">
            <CountText text={String(data.totalPatients)} />
          </b>
        </StatTile>

        <StatTile icon={HeartPulse} tone="marino" label="En tratamiento" index={1}>
          <b className="font-display text-[28px] font-bold leading-none tracking-[-1px] text-slate-900 tabular-nums">
            <CountText text={String(data.inTreatment)} />
          </b>
        </StatTile>

        <StatTile icon={TrendingUp} tone="aqua" label="Progreso diario" index={2}>
          <div className="flex items-baseline justify-between gap-2">
            <b className="font-display text-[28px] font-bold leading-none tracking-[-1px] text-[#17656c] tabular-nums">
              <CountText text={`${progressPercent} %`} />
            </b>
            <span className="rounded-full bg-[var(--ok-bg)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--ok-text)]">
              {progressPercent >= 100 ? "Completo" : "En progreso"}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 shadow-[inset_0_1px_2px_rgba(13,27,42,.08)]">
            <div className="zs-grow-x h-full rounded-full bg-gradient-to-r from-[#1e737b] to-[#50c9d5]" style={{ width: `${Math.max(2, progressPercent)}%` }} />
          </div>
        </StatTile>

        <StatTile icon={CalendarCheck} tone="oscuro" label="Pacientes de hoy" index={3}>
          <div className="font-display text-[28px] font-bold leading-none tracking-[-1px] text-slate-900 tabular-nums">
            <span className="text-[#17656c]">
              <CountText text={String(data.completedToday)} />
            </span>
            <span className="text-slate-500"> / </span>
            {totalToday}
          </div>
          <span className="mt-1.5 block text-[12px] text-slate-500">atendidos de los agendados</span>
        </StatTile>
      </div>
    </div>
  );
}
