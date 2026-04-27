"use client";

import { useEffect, useMemo, useState } from "react";

type VacationItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startDate: string;
  endDate: string;
  note: string;
  status: "pending" | "approved" | "rejected";
};

type ProfessionalLimit = {
  userId: string;
  userName: string;
  userEmail: string;
  maxConsecutiveDays: number;
  usedDays: number;
  availableDays: number;
  annualDays: number;
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

export default function VacationsTeam() {
  const [requests, setRequests] = useState<VacationItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalLimit[]>([]);
  const [limitDrafts, setLimitDrafts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | VacationItem["status"]>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vacations/team", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo cargar el equipo.");
      setRequests(data.requests ?? []);
      setProfessionals(data.professionals ?? []);
      setLimitDrafts(
        Object.fromEntries((data.professionals ?? []).map((item: ProfessionalLimit) => [item.userId, item.maxConsecutiveDays]))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((item) => item.status === statusFilter);
  }, [requests, statusFilter]);

  async function updateStatus(requestId: string, status: VacationItem["status"]) {
    try {
      const res = await fetch("/api/vacations/team", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  async function saveLimit(userId: string) {
    const maxConsecutiveDays = limitDrafts[userId];
    try {
      const res = await fetch("/api/vacations/team", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, maxConsecutiveDays }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo guardar el limite.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el limite.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Mi clinica</p>
        <h1 className="text-2xl font-semibold text-slate-900">Vacaciones del equipo</h1>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Configuracion por profesional</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define el campo &quot;Limite de dias permitidos&quot; para cada profesional.
        </p>
        <div className="mt-4 grid gap-2">
          {professionals.map((professional) => (
            <div key={professional.userId} className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_100px_150px_130px]">
              <div>
                <p className="text-sm font-semibold text-slate-900">{professional.userName}</p>
                <p className="text-xs text-slate-500">{professional.userEmail}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Consumidos {professional.usedDays}/{professional.annualDays} dias - disponibles {professional.availableDays}
                </p>
              </div>
              <input
                type="number"
                min={1}
                max={60}
                value={limitDrafts[professional.userId] ?? professional.maxConsecutiveDays}
                onChange={(event) =>
                  setLimitDrafts((prev) => ({
                    ...prev,
                    [professional.userId]: Number(event.target.value),
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              />
              <p className="text-xs text-slate-500">Limite de dias permitidos</p>
              <button
                type="button"
                onClick={() => saveLimit(professional.userId)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Guardar limite
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Solicitudes de vacaciones por usuario en la clinica actual.</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["all", "pending", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === status
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {status === "all" ? "Todos" : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Cargando vacaciones...</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-slate-400">No hay solicitudes para mostrar.</p>}

        <div className="space-y-2">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.userName}</p>
                  <p className="text-xs text-slate-500">{item.userEmail}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {item.startDate} al {item.endDate}
                  </p>
                  {item.note ? <p className="mt-1 text-xs text-slate-500">{item.note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "approved")}
                      className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "rejected")}
                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
