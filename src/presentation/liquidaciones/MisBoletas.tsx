"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/presentation/dashboard/shared";
import type { ProfessionalInvoiceView } from "@/server/professional-payouts/ProfessionalInvoicesService";

// Guia oficial del SII para emitir una boleta de honorarios electronica.
const SII_GUIDE_URL = "https://www.sii.cl/como_se_hace_para/boletas/guia_emitir_bhe.htm";

const STATUS_LABEL: Record<ProfessionalInvoiceView["status"], string> = {
  PENDING: "Pendiente de emitir",
  ISSUED: "Emitida",
  PAID: "Pagada",
  CANCELLED: "Anulada",
};

function getCurrentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!value}
      aria-label={`Copiar ${label}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 transition hover:border-[#19b3bc] hover:text-[#0f9ea8] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function Field({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-[14px] font-medium text-slate-900">
          {value || "Sin definir"}
        </p>
      </div>
      <CopyButton value={copyValue ?? value} label={label} />
    </div>
  );
}

function InvoiceCard({
  invoice,
  onChanged,
}: {
  invoice: ProfessionalInvoiceView;
  onChanged: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber ?? "");
  const [delegationDate, setDelegationDate] = useState(invoice.delegationUntil?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const closed = invoice.status === "PAID" || invoice.status === "CANCELLED";
  const today = new Date().toISOString().slice(0, 10);

  const send = async (url: string, body: unknown, okMessage: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setMessage(okMessage);
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-slate-900">Boleta de {invoice.monthLabel}</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {invoice.sessionCount} atenciones liquidadas
          </p>
        </div>
        <span className="rounded-full bg-[#eef7f7] px-3 py-1 text-[12px] font-semibold text-[#0f9ea8]">
          {STATUS_LABEL[invoice.status]}
          {invoice.invoiceNumber ? ` · N° ${invoice.invoiceNumber}` : ""}
        </span>
      </div>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <p className="text-[12px] font-semibold text-slate-500">
            Paso 1. Copia estos datos en el formulario del SII
          </p>
          {!invoice.receiver.complete ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800">
              La clinica aun no configuro su razon social y RUT. Pideselos a un administrador.
            </p>
          ) : null}
          <Field label="Razon social del receptor" value={invoice.receiver.legalName} />
          <Field label="RUT del receptor" value={invoice.receiver.taxId} />
          <Field label="Descripcion del servicio" value={invoice.concept} />
          <Field
            label="Monto bruto de la boleta"
            value={formatCurrency(invoice.baseAmount)}
            copyValue={String(Math.round(invoice.baseAmount))}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-[12px] font-semibold text-slate-500">Lo que vas a recibir</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] text-slate-700">
            <div className="flex justify-between py-0.5">
              <span>Monto bruto de la boleta</span>
              <strong>{formatCurrency(invoice.baseAmount)}</strong>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Retencion SII ({formatPercent(invoice.siiPercentage)})</span>
              <strong>- {formatCurrency(invoice.siiRetentionAmount)}</strong>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-[14px] text-[#0f9ea8]">
              <span>Liquido a recibir</span>
              <strong>{formatCurrency(invoice.netAmount)}</strong>
            </div>
          </div>
          {!invoice.rateMatchesLegal && invoice.legalRatePercent !== null ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800">
              El SII retiene {formatPercent(invoice.legalRatePercent)} en este ano y la clinica tiene
              configurado {formatPercent(invoice.siiPercentage)}. El liquido real puede diferir.
            </p>
          ) : null}

          <p className="mt-1 text-[12px] font-semibold text-slate-500">
            Paso 2. Emite la boleta en el SII
          </p>
          <a
            href={SII_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0f9ea8] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b8e97]"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir guia del SII para emitir
          </a>

          <p className="mt-1 text-[12px] font-semibold text-slate-500">
            Paso 3. Registra el numero de tu boleta
          </p>
          <div className="flex gap-2">
            <input
              id={`invoice-number-${invoice.id}`}
              inputMode="numeric"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="N° de boleta"
              disabled={closed || busy}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-700 outline-none transition focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10 disabled:bg-slate-50"
            />
            <button
              type="button"
              disabled={closed || busy || !invoiceNumber}
              onClick={() =>
                void send(
                  `/api/professional-payouts/invoices/${invoice.id}`,
                  { action: "issue", invoiceNumber },
                  "Boleta registrada."
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0f9ea8] px-4 text-[13px] font-semibold text-[#0f9ea8] transition hover:bg-[#f2fbfb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Ya la emiti
            </button>
          </div>
          {message ? <p className="text-[12px] text-slate-600">{message}</p> : null}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-[12px] text-slate-600">
              Si prefieres que la clinica emita tu boleta, autoriza a un usuario de la clinica en
              la Oficina Virtual del SII (dura hasta un ano) y registra aqui la fecha de termino.
              {invoice.delegationActive && invoice.delegationUntil
                ? ` Autorizacion vigente hasta ${new Date(invoice.delegationUntil).toLocaleDateString("es-CL")}.`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <input
              id={`delegation-${invoice.id}`}
              type="date"
              min={today}
              value={delegationDate}
              onChange={(event) => setDelegationDate(event.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#19b3bc]"
            />
            <button
              type="button"
              disabled={busy || !delegationDate}
              onClick={() =>
                void send(
                  "/api/professional-payouts/delegation",
                  { until: delegationDate },
                  "Autorizacion registrada."
                )
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
            >
              Guardar
            </button>
            {invoice.delegationActive ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDelegationDate("");
                  void send("/api/professional-payouts/delegation", { until: null }, "Autorizacion retirada.");
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MisBoletas() {
  const searchParams = useSearchParams();
  const initialMonth = searchParams.get("month");
  const [month, setMonth] = useState(
    initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth) ? initialMonth : getCurrentMonthValue()
  );
  const [invoices, setInvoices] = useState<ProfessionalInvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/professional-payouts/invoices?month=${targetMonth}`, {
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
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight text-slate-900">Mi boleta de honorarios</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Copia los datos, emite la boleta en el SII y registra su numero.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="mis-boletas-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-[14px] text-slate-700 outline-none focus:border-[#19b3bc]"
          />
          <button
            type="button"
            onClick={() => void load(month)}
            disabled={loading}
            aria-label="Actualizar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && invoices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
          No tienes una boleta pendiente para este mes. Aparecera cuando la clinica cierre el mes.
        </p>
      ) : null}

      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} onChanged={() => void load(month)} />
      ))}
    </div>
  );
}
