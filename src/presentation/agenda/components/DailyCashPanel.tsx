"use client";

import { useMemo, useState } from "react";
import type { AgendaDailyCashItem, AgendaDailyCashSummary } from "../agenda.types";
import {
  formatCurrency,
  formatFullDateLabel,
} from "../agenda.utils";

type Props = {
  summary: AgendaDailyCashSummary;
  items: AgendaDailyCashItem[];
  loading: boolean;
  onBackToAgenda: () => void;
  onCreateMovement: (input: {
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
  }) => Promise<void>;
};

function getTimeFromDate(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getCashDateLabel() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return formatter
    .format(now)
    .replaceAll(".", "")
    .replace(/^./, (c) => c.toUpperCase());
}

/* ─── Movement Modal ─── */
function MovementModal({
  type,
  onClose,
  onSubmit,
}: {
  type: "INCOME" | "EXPENSE";
  onClose: () => void;
  onSubmit: (input: { type: "INCOME" | "EXPENSE"; description: string; amount: number }) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = type === "INCOME";
  const title = isIncome ? "Registrar ingreso" : "Registrar egreso";
  const subtitle = isIncome
    ? "Agrega un ingreso manual a la caja del dia."
    : "Registra un gasto o retiro de la caja del dia.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setError("La descripcion es obligatoria.");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ type, description: description.trim(), amount: parsedAmount });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-modal-in rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10">
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${isIncome ? "bg-emerald-100" : "bg-rose-100"}`}>
          {isIncome ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          )}
        </div>

        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Descripcion
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isIncome ? "Ej: Pago consulta particular" : "Ej: Compra insumos medicos"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Monto
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !description.trim() || !amount}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:shadow-none ${
                isIncome
                  ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:bg-emerald-300"
                  : "bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20 disabled:bg-rose-300"
              }`}
            >
              {saving ? "Guardando..." : isIncome ? "Registrar ingreso" : "Registrar egreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Close Cash Modal ─── */
function CloseCashModal({
  summary,
  items,
  onClose,
  onConfirm,
}: {
  summary: AgendaDailyCashSummary;
  items: AgendaDailyCashItem[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const balance = summary?.totalAmount ?? 0;

  const incomeCount = items.filter((i) => i.amount > 0).length;
  const expenseCount = items.filter((i) => i.amount < 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-modal-in rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">Cierre de caja</h2>
        <p className="mt-1 text-xs text-slate-500">Resumen del dia &mdash; {getCashDateLabel()}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total ingresos</p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">{formatCurrency(totalIncome)}</p>
            <p className="text-[11px] text-slate-400">{incomeCount} movimiento{incomeCount !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total egresos</p>
            <p className="mt-1 text-lg font-semibold text-rose-500">{formatCurrency(totalExpense)}</p>
            <p className="text-[11px] text-slate-400">{expenseCount} movimiento{expenseCount !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Saldo final</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3 text-xs text-slate-500">
          <p>Al cerrar la caja se generara un resumen del dia. Podras seguir consultando el historial de movimientos.</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20"
          >
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Panel ─── */
export default function DailyCashPanel({ summary, items, loading, onBackToAgenda, onCreateMovement }: Props) {
  const [movementModal, setMovementModal] = useState<"INCOME" | "EXPENSE" | null>(null);
  const [closeCashModal, setCloseCashModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const byTreatment = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.movementType !== "PAYMENT" || item.status !== "PAID") continue;
      map.set(item.treatmentName, (map.get(item.treatmentName) ?? 0) + item.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = { PAID: 0, PENDING: 0, WAIVED: 0 };
    for (const item of items) {
      if (item.movementType !== "PAYMENT") continue;
      map[item.status] = (map[item.status] ?? 0) + item.amount;
    }
    return map;
  }, [items]);

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const balance = summary?.totalAmount ?? 0;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleMovementSubmit = async (input: { type: "INCOME" | "EXPENSE"; description: string; amount: number }) => {
    await onCreateMovement(input);
    showSuccess(input.type === "INCOME" ? "Ingreso registrado." : "Egreso registrado.");
  };

  const handleCloseCash = () => {
    setCloseCashModal(false);
    showSuccess("Caja cerrada correctamente.");
    onBackToAgenda();
  };

  return (
    <div className="mt-5 space-y-5">
      {/* ── Banner caja abierta ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Caja abierta &mdash; {getCashDateLabel()}
          </p>
          <p className="text-xs text-slate-500">
            {summary?.totalCount ?? 0} movimiento{(summary?.totalCount ?? 0) !== 1 ? "s" : ""} registrado{(summary?.totalCount ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMovementModal("INCOME")}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setMovementModal("EXPENSE")}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-rose-600 hover:shadow-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Egreso
          </button>
          <button
            type="button"
            onClick={() => setCloseCashModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900"
          >
            Cierre de caja
          </button>
        </div>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Saldo actual</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCurrency(balance)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total ingresos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total egresos</p>
          <p className="mt-2 text-2xl font-semibold text-rose-500">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Movimientos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary?.totalCount ?? 0}
          </p>
        </div>
      </div>

      {/* ── Contenido: tabla + sidebar ── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        {/* Tabla de movimientos */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Movimientos del dia</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Hora</th>
                  <th className="px-3 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 font-medium">Motivo</th>
                  <th className="px-3 py-3 text-right font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                      Cargando caja del dia...
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                      Todavia no hay movimientos registrados en la caja de hoy.
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((item, idx) => {
                    const isIncome = item.amount > 0;
                    const isExpenseMovement = item.movementType === "EXPENSE";
                    const isManualIncome = item.movementType === "INCOME";
                    const isPayment = item.movementType === "PAYMENT";

                    let typeBadge: { label: string; classes: string };
                    if (isExpenseMovement) {
                      typeBadge = { label: "Egreso", classes: "bg-rose-50 text-rose-600" };
                    } else if (isManualIncome) {
                      typeBadge = { label: "Ingreso", classes: "bg-emerald-50 text-emerald-700" };
                    } else if (item.status === "PAID") {
                      typeBadge = { label: "Ingreso", classes: "bg-emerald-50 text-emerald-700" };
                    } else if (item.status === "PENDING") {
                      typeBadge = { label: "Pendiente", classes: "bg-amber-50 text-amber-700" };
                    } else {
                      typeBadge = { label: "Exento", classes: "bg-slate-100 text-slate-600" };
                    }

                    let motivo: string;
                    if (isPayment) {
                      motivo = `Pago — ${item.patientName}`;
                    } else {
                      motivo = item.notes ?? (item.patientName || "Movimiento manual");
                    }

                    const subMotivo = isPayment ? item.treatmentName : null;

                    return (
                      <tr
                        key={item.id}
                        style={{ animationDelay: `${idx * 25}ms` }}
                        className="animate-card-in border-b border-slate-50 transition-colors last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {getTimeFromDate(item.recordedAt)}
                        </td>

                        <td className="px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeBadge.classes}`}>
                            {isIncome ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11" /><line x1="12" y1="6" x2="12" y2="18" /></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13" /><line x1="12" y1="18" x2="12" y2="6" /></svg>
                            )}
                            {typeBadge.label}
                          </span>
                        </td>

                        <td className="max-w-[260px] px-3 py-3.5">
                          <span className="block truncate font-medium text-slate-800">{motivo}</span>
                          {subMotivo && (
                            <span className="block truncate text-xs text-slate-400">({subMotivo})</span>
                          )}
                        </td>

                        <td className={`whitespace-nowrap px-3 py-3.5 text-right font-semibold ${isIncome ? "text-emerald-600" : "text-rose-500"}`}>
                          {isIncome ? "+" : ""}{formatCurrency(item.amount)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-400">
                          {item.userName ?? formatFullDateLabel(item.recordedAt)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-4">
          {/* Por estado */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Por estado</h3>
            </div>
            <div className="space-y-3.5 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pagados</span>
                <span className="font-semibold text-slate-900">{formatCurrency(byStatus.PAID ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pendientes</span>
                <span className="font-semibold text-slate-900">{formatCurrency(byStatus.PENDING ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Exentos</span>
                <span className="font-semibold text-slate-900">{formatCurrency(byStatus.WAIVED ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Por especialidad / tratamiento */}
          {byTreatment.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-900">Por especialidad</h3>
              </div>
              <div className="space-y-3.5 px-5 py-4 text-sm">
                {byTreatment.map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="truncate text-slate-600">{name}</span>
                    <span className="ml-3 whitespace-nowrap font-semibold text-slate-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      {movementModal && (
        <MovementModal
          type={movementModal}
          onClose={() => setMovementModal(null)}
          onSubmit={handleMovementSubmit}
        />
      )}

      {closeCashModal && (
        <CloseCashModal
          summary={summary}
          items={items}
          onClose={() => setCloseCashModal(false)}
          onConfirm={handleCloseCash}
        />
      )}

      {/* Toast de exito */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
