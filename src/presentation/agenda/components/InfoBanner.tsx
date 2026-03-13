"use client";

import { useInfoBannerViewModel } from "./InfoBannerViewModel";

export default function InfoBanner() {
  const { state } = useInfoBannerViewModel();
  const { data, loading, totalToday, progressPercent } = state;

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
        <div className="h-24 rounded-xl bg-slate-50" />
      </div>
    );
  }

  if (!data) return null;

  const isDoctor = data.mode === "doctor";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
      {/* Fila superior: identidad */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500">
            {data.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{data.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
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

      {/* Fila inferior: estadísticas */}
      <div className="mt-4 flex flex-wrap items-end gap-0">
        {/* Pacientes */}
        <div className="flex flex-col border-r border-slate-100 pr-5">
          <span className="text-xs text-slate-400">Pacientes</span>
          <span className="text-2xl font-bold text-slate-900">{data.totalPatients}</span>
        </div>

        {/* En tratamiento */}
        <div className="flex flex-col border-r border-slate-100 px-5">
          <span className="text-xs text-slate-400">En Tratamiento</span>
          <span className="text-2xl font-bold text-slate-900">{data.inTreatment}</span>
        </div>

        {/* Proyección de ganancias / Progreso */}
        <div className="flex flex-1 flex-wrap items-end gap-5 pl-5">
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500">Progreso diario</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                En progreso
              </span>
              <span className="text-sm font-semibold text-slate-700">{progressPercent}%</span>
            </div>
          </div>

          <div className="border-l border-slate-100 pl-5">
            <span className="text-xs text-slate-400">Pacientes de hoy</span>
            <div className="mt-0.5 text-lg font-bold text-slate-900">
              <span className="text-emerald-500">{data.completedToday}</span>
              <span className="text-slate-300"> / </span>
              {totalToday}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
