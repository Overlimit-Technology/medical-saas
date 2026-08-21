"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Percent, Stethoscope, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/presentation/dashboard/shared";
import {
  deriveProfessionalPayoutAmounts,
} from "@/lib/professional-payouts/calculations";
import type { ProfessionalPayoutRow } from "@/domain/professional-payouts/entities/ProfessionalPayout";

type MyPayoutData = {
  settings: { clinicPercentage: number; siiPercentage: number };
  professional: ProfessionalPayoutRow | null;
};

function getCurrentMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(date);
}

export default function MyLiquidacionesTab() {
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [data, setData] = useState<MyPayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional-payouts/me?month=${targetMonth}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Error al cargar liquidacion.");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la liquidacion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(month);
  }, [loadData, month]);

  const derived = useMemo(() => {
    if (!data?.professional || !data.settings) return null;
    const p = data.professional;
    const amounts = deriveProfessionalPayoutAmounts(
      p.grossAmount,
      data.settings.clinicPercentage,
      data.settings.siiPercentage,
    );
    return { ...p, ...amounts };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Mis liquidaciones</h3>
            <p className="text-sm text-slate-500">Desglose mensual de tus tratamientos</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none focus:border-[#19b3bc]"
            />
            <button
              type="button"
              onClick={() => void loadData(month)}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]" />
        </div>
      )}

      {!loading && !derived && (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <Coins className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No hay datos de liquidacion para {formatMonthLabel(month)}.
          </p>
        </section>
      )}

      {derived && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="Atenciones" value={derived.sessionCount} icon={Stethoscope} />
            <SummaryCard label="Bruto" value={formatCurrency(derived.grossAmount)} icon={Coins} />
            <SummaryCard
              label="Desc. Clinica"
              value={`-${formatCurrency(derived.clinicRetentionAmount)}`}
              icon={Percent}
            />
            <SummaryCard
              label="Neto"
              value={formatCurrency(derived.netAmount)}
              icon={Coins}
              emphasized
            />
          </div>

          {/* Treatments breakdown */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h4 className="text-sm font-semibold text-slate-900">Detalle por tratamiento</h4>
              <p className="text-xs text-slate-500">{formatMonthLabel(month)}</p>
            </div>

            {derived.treatments.length > 0 ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Tratamiento</th>
                    <th className="px-4 py-2.5 font-semibold">Sesiones</th>
                    <th className="px-4 py-2.5 font-semibold">Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.treatments.map((t) => (
                    <tr key={t.treatmentId} className="border-t border-slate-100">
                      <td className="px-5 py-2.5 text-sm font-medium text-slate-800">{t.name}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{t.sessionCount}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                        {formatCurrency(t.grossAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-500">
                Sin sesiones liquidables este mes.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  emphasized,
}: {
  label: string;
  value: string | number;
  icon: typeof Coins;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        emphasized
          ? "border-[#19b3bc]/20 bg-[#f2fbfb]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${emphasized ? "text-[#0f9ea8]" : "text-slate-400"}`} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p
        className={`mt-2 text-lg font-semibold ${
          emphasized ? "text-[#0f9ea8]" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
