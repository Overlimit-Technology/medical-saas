"use client";

import type {
  AgendaDoctor,
  AgendaDoctorViewMode,
  AgendaView,
  AgendaCalendarMode,
} from "../agenda.types";

type Props = {
  activeView: AgendaView;
  agendaMode: AgendaCalendarMode;
  doctorViewMode: AgendaDoctorViewMode;
  selectedDoctorId: string;
  doctors: AgendaDoctor[];
  isDoctor: boolean;
  canManageDailyCash: boolean;
  canManageStatusColors: boolean;
  periodLabel: string;
  dailyCashLoading: boolean;
  onSetActiveView: (view: AgendaView) => void;
  onSetAgendaMode: (mode: AgendaCalendarMode) => void;
  onSetDoctorViewMode: (mode: AgendaDoctorViewMode) => void;
  onSetSelectedDoctorId: (doctorId: string) => void;
  onShowColorSettings: () => void;
  onGoToToday: () => void;
  onGoToPreviousPeriod: () => void;
  onGoToNextPeriod: () => void;
  onReloadDailyCash: () => void;
};

const filterSelectClassName =
  "rounded-full border border-[#19b3bc]/20 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/15 disabled:cursor-not-allowed disabled:opacity-60";

export default function AgendaHeader({
  activeView,
  agendaMode,
  doctorViewMode,
  selectedDoctorId,
  doctors,
  isDoctor,
  canManageDailyCash,
  canManageStatusColors,
  periodLabel,
  dailyCashLoading,
  onSetActiveView,
  onSetAgendaMode,
  onSetDoctorViewMode,
  onSetSelectedDoctorId,
  onShowColorSettings,
  onGoToToday,
  onGoToPreviousPeriod,
  onGoToNextPeriod,
  onReloadDailyCash,
}: Props) {
  const title =
    activeView === "dailyCash"
      ? "Caja del dia"
      : agendaMode === "boxDay"
        ? "Calendario por box"
        : agendaMode === "doctor"
          ? "Calendario por profesional"
          : "Calendario";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {isDoctor && (
            <span className="inline-flex rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
              Sin edicion de agenda
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {canManageDailyCash && (
            <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => onSetActiveView("agenda")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  activeView === "agenda"
                    ? "bg-[#19b3bc] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => onSetActiveView("dailyCash")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  activeView === "dailyCash"
                    ? "bg-[#19b3bc] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Caja del dia
              </button>
            </div>
          )}

          {activeView === "agenda" ? (
            <>
              {canManageStatusColors && (
                <button
                  type="button"
                  onClick={onShowColorSettings}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  title="Colores de estado"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.1 2.5-.3C13.6 20.4 13 18.8 13 17c0-3.3 2.7-6 6-6 1.8 0 3.4.6 4.7 1.5.2-.8.3-1.6.3-2.5C24 6.5 19.5 2 14 2z" /><circle cx="7.5" cy="11.5" r="1.5" /><circle cx="12" cy="7.5" r="1.5" /><circle cx="16.5" cy="11.5" r="1.5" /></svg>
                </button>
              )}
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                onClick={onGoToToday}
              >
                Hoy
              </button>
              <div className="flex items-center gap-1 rounded-full border border-slate-200 px-1 py-0.5">
                <button
                  type="button"
                  aria-label="Periodo anterior"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  onClick={onGoToPreviousPeriod}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="min-w-[132px] text-center text-sm font-medium text-slate-700">{periodLabel}</span>
                <button
                  type="button"
                  aria-label="Periodo siguiente"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  onClick={onGoToNextPeriod}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onReloadDailyCash}
              className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {dailyCashLoading ? "Actualizando..." : "Actualizar caja"}
            </button>
          )}
        </div>
      </div>

      {activeView === "agenda" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#19b3bc]/10 bg-[#19b3bc]/[0.04] p-3">
          <div className="flex items-center rounded-full border border-[#19b3bc]/15 bg-white p-1 shadow-sm shadow-[#19b3bc]/5">
            <button
              type="button"
              onClick={() => onSetAgendaMode("general")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                agendaMode === "general"
                  ? "bg-[#19b3bc] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => onSetAgendaMode("boxDay")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                agendaMode === "boxDay"
                  ? "bg-[#19b3bc] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por box
            </button>
            <button
              type="button"
              onClick={() => onSetAgendaMode("doctor")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                agendaMode === "doctor"
                  ? "bg-[#19b3bc] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por profesional
            </button>
          </div>

          {agendaMode === "doctor" && (
            <>
              <select
                value={selectedDoctorId}
                onChange={(event) => onSetSelectedDoctorId(event.target.value)}
                className={filterSelectClassName}
                disabled={doctors.length === 0 || isDoctor}
              >
                {doctors.length === 0 ? (
                  <option value="">Sin profesionales</option>
                ) : null}
                {doctors.map((doctor) => {
                  const label = `${doctor.profile?.firstName ?? ""} ${doctor.profile?.lastName ?? ""}`.trim();
                  return (
                    <option key={doctor.id} value={doctor.id}>
                      {label || "Profesional"}
                    </option>
                  );
                })}
              </select>

              <div className="flex items-center rounded-full border border-[#19b3bc]/15 bg-white p-1 shadow-sm shadow-[#19b3bc]/5">
                <button
                  type="button"
                  onClick={() => onSetDoctorViewMode("day")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    doctorViewMode === "day"
                      ? "bg-[#19b3bc] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Diario
                </button>
                <button
                  type="button"
                  onClick={() => onSetDoctorViewMode("week")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    doctorViewMode === "week"
                      ? "bg-[#19b3bc] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semanal
                </button>
              </div>
            </>
          )}

          {agendaMode === "boxDay" && (
            <span className="rounded-full border border-[#19b3bc]/15 bg-white px-4 py-2 text-sm font-medium text-[#0f8f98] shadow-sm shadow-[#19b3bc]/5">
              Vista diaria agrupada por box
            </span>
          )}
        </div>
      )}
    </div>
  );
}
