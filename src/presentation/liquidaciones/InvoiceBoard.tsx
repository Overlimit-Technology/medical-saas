"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/presentation/dashboard/shared";
import type { ProfessionalInvoiceView } from "@/server/professional-payouts/ProfessionalInvoicesService";

const STATUS_STYLE: Record<ProfessionalInvoiceView["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ISSUED: "bg-sky-50 text-sky-700",
  PAID: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<ProfessionalInvoiceView["status"], string> = {
  PENDING: "Pendiente",
  ISSUED: "Emitida",
  PAID: "Pagada",
  CANCELLED: "Anulada",
};

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "No se pudo guardar.");
}

function ReceiverForm({ onSaved }: { onSaved: () => void }) {
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/clinic-profile", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.ok) {
          setLegalName(json.legalName ?? "");
          setTaxId(json.taxId ?? "");
        }
      } catch {
        // El formulario queda vacio; el admin puede completarlo igual.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await patchJson("/api/clinic-profile", { legalName, taxId });
      setMessage("Datos guardados.");
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-[18px] border border-slate-200 bg-slate-50/80 px-3.5 py-3 lg:flex-row lg:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-medium text-slate-500">
        Razon social (receptor de la boleta)
        <input
          id="invoice-legal-name"
          value={legalName}
          onChange={(event) => setLegalName(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-700 outline-none focus:border-[#50c9d5]"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-500 lg:w-[200px]">
        RUT de la empresa
        <input
          id="invoice-tax-id"
          value={taxId}
          onChange={(event) => setTaxId(event.target.value)}
          placeholder="76.123.456-7"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-700 outline-none focus:border-[#50c9d5]"
        />
      </label>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="h-10 rounded-xl border border-[#0f9ea8] px-4 text-[13px] font-semibold text-[#0f9ea8] transition hover:bg-[#f2fbfb] disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {message ? <p className="text-[12px] text-slate-600 lg:self-center">{message}</p> : null}
    </div>
  );
}

export default function InvoiceBoard({
  month,
  refreshToken,
}: {
  month: string;
  refreshToken: number;
}) {
  const [invoices, setInvoices] = useState<ProfessionalInvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional-payouts/invoices?month=${month}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudieron cargar las boletas.");
      setInvoices(json.data.invoices as ProfessionalInvoiceView[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las boletas.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const run = async (id: string, body: unknown) => {
    setBusyId(id);
    setError(null);
    try {
      await patchJson(`/api/professional-payouts/invoices/${id}`, body);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = invoices.filter((invoice) => invoice.status === "PENDING").length;
  const issuedCount = invoices.filter((invoice) => invoice.status === "ISSUED").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "PAID").length;
  const rateWarning = invoices.find((invoice) => !invoice.rateMatchesLegal);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4">
        <h2 className="text-[16px] font-semibold text-slate-900">Boletas de honorarios del mes</h2>
        <p className="text-[12px] text-slate-500">
          {invoices.length === 0
            ? "Aun no hay boletas. Se crean al cerrar el mes y avisar a los profesionales."
            : `${pendingCount} pendientes, ${issuedCount} emitidas, ${paidCount} pagadas.`}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        <ReceiverForm onSaved={() => void load()} />

        {rateWarning && rateWarning.legalRatePercent !== null ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800">
            La retencion del SII para este ano es {rateWarning.legalRatePercent}% y esta
            configurada en {rateWarning.siiPercentage}%. Ajustala en el campo % SII y vuelve a cerrar el mes.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}

        {invoices.length > 0 ? (
          <div className="overflow-x-auto rounded-[18px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Profesional</th>
                  <th className="px-4 py-2.5">Monto boleta</th>
                  <th className="px-4 py-2.5">Retencion SII</th>
                  <th className="px-4 py-2.5">Liquido</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Autorizacion SII</th>
                  <th className="px-4 py-2.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const busy = busyId === invoice.id;
                  const closed = invoice.status === "PAID" || invoice.status === "CANCELLED";
                  return (
                    <tr key={invoice.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-slate-900">{invoice.doctorName}</p>
                        <p className="text-[12px] text-slate-500">{invoice.specialty}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-800">
                        {formatCurrency(invoice.baseAmount)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-600">
                        {formatCurrency(invoice.siiRetentionAmount)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#0f9ea8]">
                        {formatCurrency(invoice.netAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[invoice.status]}`}
                        >
                          {STATUS_LABEL[invoice.status]}
                        </span>
                        {invoice.invoiceNumber ? (
                          <p className="mt-1 text-[11px] text-slate-500">N° {invoice.invoiceNumber}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600">
                        {invoice.delegationActive && invoice.delegationUntil
                          ? `Hasta ${new Date(invoice.delegationUntil).toLocaleDateString("es-CL")}`
                          : "No autorizada"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {!closed && (invoice.delegationActive || invoice.status === "PENDING") ? (
                            <>
                              <input
                                id={`board-number-${invoice.id}`}
                                inputMode="numeric"
                                placeholder="N° boleta"
                                value={numbers[invoice.id] ?? ""}
                                onChange={(event) =>
                                  setNumbers((current) => ({
                                    ...current,
                                    [invoice.id]: event.target.value.replace(/\D/g, "").slice(0, 10),
                                  }))
                                }
                                className="h-8 w-[110px] rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-[#50c9d5]"
                              />
                              <button
                                type="button"
                                disabled={busy || !numbers[invoice.id]}
                                onClick={() =>
                                  void run(invoice.id, {
                                    action: "issue",
                                    invoiceNumber: numbers[invoice.id],
                                  })
                                }
                                className="h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50"
                              >
                                Registrar
                              </button>
                            </>
                          ) : null}
                          {invoice.status === "ISSUED" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void run(invoice.id, { action: "status", status: "PAID" })}
                              className="h-8 rounded-lg bg-[#0f9ea8] px-2.5 text-[12px] font-semibold text-white hover:bg-[#0b8e97] disabled:opacity-50"
                            >
                              Marcar pagada
                            </button>
                          ) : null}
                          {!closed ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(invoice.id, { action: "status", status: "CANCELLED" })
                              }
                              className="h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-500 hover:border-slate-300 disabled:opacity-50"
                            >
                              Anular
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <p className="text-[12px] text-slate-500">Cargando...</p>
        ) : null}
      </div>
    </section>
  );
}
