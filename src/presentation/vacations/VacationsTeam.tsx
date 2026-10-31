"use client";

import { CalendarDays } from "lucide-react";
import { Card, EmptyState, IconBox, Loading, Notice, PageHead, Segmented, StatusPill, View, btnClass, zs } from "@/presentation/ui/zs";
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

  const pendingCount = requests.filter((item) => item.status === "pending").length;

  return (
    <View label="Vacaciones del equipo" wide>
      <PageHead
        tag="Equipo"
        title="Vacaciones"
        accent="del equipo"
        lead="Aprueba las solicitudes y define cuántos días seguidos puede tomar cada profesional."
      />

      {error ? <Notice tone="err">{error}</Notice> : null}

      <Card
        title={
          <>
            Solicitudes{" "}
            {pendingCount ? <StatusPill tone="warn">{pendingCount} por aprobar</StatusPill> : <StatusPill tone="ok">Al día</StatusPill>}
          </>
        }
        action={
          <Segmented
            label="Estado"
            value={statusFilter}
            onChange={setStatusFilter}
            items={(["all", "pending", "approved", "rejected"] as const).map((status) => ({
              id: status,
              label: status === "all" ? "Todas" : STATUS_LABELS[status],
            }))}
          />
        }
      >
        {loading ? (
          <Loading label="Cargando vacaciones…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No hay solicitudes con este filtro">Cuando alguien pida vacaciones, aparecerá aquí.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 border-t border-slate-200 py-3.5 first:border-t-0 first:pt-0">
                <IconBox icon={CalendarDays} tone={item.status === "pending" ? "warn" : "accent"} />
                <div className="min-w-0 flex-1 basis-60">
                  <b className="block font-display text-[15px] font-semibold text-slate-900">{item.userName}</b>
                  <span className="block text-[13.5px] text-slate-700">
                    Del {item.startDate} al {item.endDate}
                  </span>
                  {item.note ? <span className={zs.small}>{item.note}</span> : null}
                </div>
                <StatusPill tone={item.status === "approved" ? "ok" : item.status === "rejected" ? "err" : "warn"}>
                  {STATUS_LABELS[item.status]}
                </StatusPill>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateStatus(item.id, "approved")} className={btnClass(item.status === "pending" ? "primary" : "quiet", "sm")}>
                    Aprobar
                  </button>
                  <button type="button" onClick={() => updateStatus(item.id, "rejected")} className={btnClass("danger", "sm")}>
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Días por profesional">
        <p className={`${zs.small} -mt-2 mb-4`}>El límite es la cantidad máxima de días seguidos que puede pedir cada persona.</p>
        <ul className="grid gap-3 xl:grid-cols-2">
          {professionals.map((professional) => {
            const pct = professional.annualDays ? Math.min(100, (professional.usedDays / professional.annualDays) * 100) : 0;
            return (
              <li key={professional.userId} className="flex flex-wrap items-center gap-4 rounded-[20px] border border-slate-200 p-4">
                <div className="min-w-0 flex-1 basis-52">
                  <b className="block truncate font-display text-[15px] font-semibold text-slate-900">{professional.userName}</b>
                  <span className="block truncate text-[12.5px] text-slate-500">{professional.userEmail}</span>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-[#50c9d5]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mt-1 block text-[12.5px] text-slate-500">
                    {professional.usedDays} de {professional.annualDays} días usados · quedan {professional.availableDays}
                  </span>
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-[12.5px] text-slate-500">Límite</span>
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
                    className={`${zs.input} min-h-[38px] w-20 py-1.5 text-center tabular-nums`}
                  />
                </label>
                <button type="button" onClick={() => saveLimit(professional.userId)} className={btnClass("quiet", "sm")}>
                  Guardar
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </View>
  );
}
