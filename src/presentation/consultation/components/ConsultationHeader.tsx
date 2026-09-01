"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CloudUpload,
  Loader2,
  MapPin,
  Timer,
} from "lucide-react";
import type {
  ConsultationAppointment,
  ConsultationPatient,
} from "@/domain/consultations/entities/Consultation";
import type { SaveState } from "../ConsultationViewModel";
import { formatElapsed, formatTime } from "../consultation.utils";

type Props = {
  patient: ConsultationPatient;
  appointment: ConsultationAppointment;
  startedAt: string | null;
  saveState: SaveState;
  isClosed: boolean;
};

const SAVE_LABELS: Record<SaveState, { text: string; className: string }> = {
  idle: { text: "Sin cambios", className: "text-slate-400" },
  pending: { text: "Cambios sin guardar", className: "text-amber-600" },
  saving: { text: "Guardando...", className: "text-[#0f8f98]" },
  saved: { text: "Guardado", className: "text-emerald-600" },
  error: { text: "No se pudo guardar", className: "text-rose-600" },
};

function SaveIcon({ state }: { state: SaveState }) {
  if (state === "saving") return <Loader2 size={13} className="animate-spin" />;
  if (state === "saved") return <Check size={13} strokeWidth={3} />;
  if (state === "error") return <AlertCircle size={13} />;
  if (state === "pending") return <CloudUpload size={13} className="animate-breathe" />;
  return <CloudUpload size={13} />;
}

/** Cronometro de la atencion. Se apaga en cuanto la consulta queda cerrada. */
function ElapsedTimer({ startedAt, frozen }: { startedAt: string; frozen: boolean }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startedAt).getTime());

  useEffect(() => {
    if (frozen) return;

    const tick = () => setElapsed(Date.now() - new Date(startedAt).getTime());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, frozen]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
        frozen ? "bg-slate-100 text-slate-500" : "bg-[#19b3bc]/10 text-[#0f8f98]"
      }`}
      title={`Consulta iniciada a las ${formatTime(startedAt)}`}
    >
      <Timer size={14} className={frozen ? "" : "animate-breathe"} />
      {formatElapsed(elapsed)}
    </span>
  );
}

export default function ConsultationHeader({
  patient,
  appointment,
  startedAt,
  saveState,
  isClosed,
}: Props) {
  const save = SAVE_LABELS[saveState];
  const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();

  return (
    <header className="sticky top-0 z-30 -mx-8 -mt-8 mb-6 border-b border-slate-100 bg-white/85 px-8 py-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href="/agenda"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:-translate-x-0.5 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Volver a la agenda"
        >
          <ArrowLeft size={17} />
        </Link>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#19b3bc] to-[#0f8f98] text-sm font-bold text-white">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight text-slate-900">
            {patient.fullName}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span className="tabular-nums">{patient.run}</span>
            {patient.age !== null && <span>· {patient.age} anos</span>}
            <span className="inline-flex items-center gap-1">
              · <MapPin size={10} /> {appointment.boxName}
            </span>
            <span className="tabular-nums">
              · {formatTime(appointment.startAt)}-{formatTime(appointment.endAt)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`hidden items-center gap-1.5 text-xs font-medium transition-colors duration-200 sm:inline-flex ${save.className}`}
          >
            <SaveIcon state={saveState} />
            {isClosed ? "Consulta cerrada" : save.text}
          </span>

          {startedAt && <ElapsedTimer startedAt={startedAt} frozen={isClosed} />}
        </div>
      </div>
    </header>
  );
}
