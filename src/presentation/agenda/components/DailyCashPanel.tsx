"use client";

import { PAYMENT_STATUS_LABELS } from "../agenda.constants";
import type { AgendaDailyCashItem, AgendaDailyCashSummary } from "../agenda.types";
import {
  formatCurrency,
  formatDateTimeLabel,
  formatFullDateLabel,
} from "../agenda.utils";

type Props = {
  summary: AgendaDailyCashSummary;
  items: AgendaDailyCashItem[];
  loading: boolean;
  onBackToAgenda: () => void;
};

export default function DailyCashPanel({ summary, items, loading, onBackToAgenda }: Props) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recaudado hoy</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatCurrency(summary?.totalAmount ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Movimientos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.totalCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pagados</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary?.paidCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pendientes / Exentos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {(summary?.pendingCount ?? 0) + (summary?.waivedCount ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="font-semibold text-slate-900">Movimientos del dia</h3>
              <p className="text-xs text-slate-400">Resumen de cobros registrados hoy</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-6 text-sm text-slate-500">Cargando caja del dia...</div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Todavia no hay cobros registrados en la caja de hoy.
              </div>
            )}

            {!loading &&
              items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.patientName}</p>
                    <p className="truncate text-sm text-slate-500">{item.treatmentName}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatFullDateLabel(item.recordedAt)} · {formatDateTimeLabel(item.recordedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {PAYMENT_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Por estado</h3>
          </div>
          <div className="space-y-4 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pagados</span>
              <span className="font-semibold text-slate-900">{summary?.paidCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pendientes</span>
              <span className="font-semibold text-slate-900">{summary?.pendingCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Exentos</span>
              <span className="font-semibold text-slate-900">{summary?.waivedCount ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Registrar cobro</h3>
          </div>
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <p>Abre una cita clinica desde la agenda para registrar su tratamiento y estado de pago.</p>
            <button
              type="button"
              onClick={onBackToAgenda}
              className="rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Volver a la agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
