"use client";

import Link from "next/link";
import { CalendarCheck, CheckCircle2, Layers, Receipt, UserX } from "lucide-react";
import type {
  ConsultationBootstrap,
  ConsultationClosureResult,
} from "@/domain/consultations/entities/Consultation";
import { formatDateTime } from "../consultation.utils";

type Props = {
  bootstrap: ConsultationBootstrap;
  result: ConsultationClosureResult;
};

/** Confirmacion de cierre: que quedo registrado y que se agendo. */
export default function ClosedSummary({ bootstrap, result }: Props) {
  const isNoShow = result.appointmentStatus === "NO_SHOW";

  const outcomes = [
    {
      icon: CheckCircle2,
      label: "Registro clinico",
      value: "Firmado y guardado en la ficha del paciente",
      shown: true,
    },
    {
      icon: CalendarCheck,
      label: "Proximo control",
      value: "Agendado en la agenda de la clinica",
      shown: Boolean(result.followUpAppointmentId) && !result.createdPlanId,
    },
    {
      icon: Layers,
      label: "Plan de sesiones",
      value: "Creado con todas sus citas",
      shown: Boolean(result.createdPlanId),
    },
    {
      icon: Receipt,
      label: "Cobro",
      value: "Registrado en la caja del dia",
      shown: result.chargeRegistered,
    },
  ].filter((item) => item.shown);

  return (
    <div className="animate-rise-in mx-auto w-full max-w-2xl py-6">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-900/5">
        <div
          className={`px-8 py-9 text-center text-white ${
            isNoShow
              ? "bg-gradient-to-br from-rose-500 to-rose-600"
              : "bg-gradient-to-br from-[#19b3bc] to-[#0f8f98]"
          }`}
        >
          <span className="animate-pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            {isNoShow ? <UserX size={30} /> : <CheckCircle2 size={30} />}
          </span>
          <h1 className="mt-4 text-2xl font-semibold">
            {isNoShow ? "Cita cerrada como ausencia" : "Consulta cerrada"}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {bootstrap.patient.fullName} · {formatDateTime(result.closedAt)}
          </p>
        </div>

        <div className="px-8 py-7">
          <ul className="space-y-2.5">
            {outcomes.map((item, index) => (
              <li
                key={item.label}
                className="animate-rise-in flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                style={{ animationDelay: `${120 + index * 70}ms` }}
              >
                <item.icon size={17} className="mt-0.5 shrink-0 text-[#0f8f98]" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.value}</p>
                </div>
              </li>
            ))}
          </ul>

          {result.warnings.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {result.warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800"
                >
                  {warning}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={`/patients/${bootstrap.patient.id}`}
              className="rounded-full border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:flex-1"
            >
              Ver ficha del paciente
            </Link>
            <Link
              href="/agenda"
              className="rounded-full bg-[#19b3bc] px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-[#19b3bc]/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#159ea7] sm:flex-1"
            >
              Volver a la agenda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
