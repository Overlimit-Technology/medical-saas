"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Hourglass } from "lucide-react";
import { differenceInBusinessDays } from "date-fns";

type VacationItem = {
  id: string;
  startDate: string;
  endDate: string;
  note: string;
  status: "pending" | "approved" | "rejected";
};

type VacationSummary = {
  year: number;
  annualDays: number;
  usedDays: number;
  availableDays: number;
  maxConsecutiveDays: number;
};

type FormState = {
  startDate: string;
  endDate: string;
  note: string;
};

const STATUS_STYLES: Record<VacationItem["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<VacationItem["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export default function VacationSettings() {
  const [items, setItems] = useState<VacationItem[]>([]);
  const [summary, setSummary] = useState<VacationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    startDate: "",
    endDate: "",
    note: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vacations/me", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudieron cargar tus vacaciones.");
      setItems(data.items ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar tus vacaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vacations/me", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setForm({ startDate: "", endDate: "", note: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const hasRange = Boolean(form.startDate && form.endDate);
  const selectedDays =
    hasRange && form.endDate >= form.startDate
      ? differenceInBusinessDays(new Date(form.endDate), new Date(form.startDate)) + 1
      : 0;
  const remainingDays = summary ? summary.availableDays - selectedDays : 0;
  const exceedsMaxConsecutive = summary ? selectedDays > summary.maxConsecutiveDays : false;
  const exceedsAvailable = summary ? selectedDays > summary.availableDays : false;
  const isInvalidSelection = exceedsMaxConsecutive || exceedsAvailable || selectedDays <= 0;

  const bannerTone = exceedsMaxConsecutive || exceedsAvailable
    ? "bg-rose-50 border-rose-200 text-rose-700"
    : hasRange && remainingDays <= 2
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-blue-50 border-blue-200 text-blue-700";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm text-slate-500">Configuracion personal</p>
        <h2 className="text-xl font-semibold text-slate-900">Mis vacaciones</h2>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className={`rounded-xl border p-3 text-sm transition-colors ${bannerTone}`}>
          <div className="flex items-start gap-2">
            {hasRange ? <Hourglass className="mt-0.5 h-4 w-4 shrink-0" /> : <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              {!hasRange && summary && (
                <p>
                  Tienes <strong>{summary.availableDays}</strong> dias de vacaciones disponibles para {summary.year}.
                </p>
              )}
              {hasRange && summary && !exceedsMaxConsecutive && !exceedsAvailable && (
                <p>
                  Seleccionando estos <strong>{selectedDays}</strong> dias, tu saldo restante sera de{" "}
                  <strong>{remainingDays}</strong> dias.
                </p>
              )}
              {hasRange && summary && exceedsMaxConsecutive && (
                <p>
                  Error: No puedes solicitar mas de <strong>{summary.maxConsecutiveDays}</strong> dias seguidos. Contacta con administracion para excepciones.
                </p>
              )}
              {hasRange && summary && !exceedsMaxConsecutive && exceedsAvailable && (
                <p>
                  Error: el rango seleccionado supera tu saldo disponible de <strong>{summary.availableDays}</strong> dias.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Inicio</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              required
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Termino</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              required
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm text-slate-600">
          <span>Comentario (opcional)</span>
          <textarea
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            rows={2}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Ej: vacaciones familiares"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || isInvalidSelection}
            className="rounded-xl bg-[#19b3bc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#159ea7] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Solicitar vacaciones"}
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-slate-400">Cargando solicitudes...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">Aun no tienes solicitudes de vacaciones.</p>}
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {item.startDate} al {item.endDate}
                </p>
                {item.note ? <p className="mt-1 text-xs text-slate-500">{item.note}</p> : null}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
