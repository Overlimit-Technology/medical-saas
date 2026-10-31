"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, ChevronLeft, Clock, CreditCard, X } from "lucide-react";
import { useSeguimientoViewModel, type FilterKey } from "./SeguimientoViewModel";
import type { SeguimientoItem } from "@/domain/seguimiento/entities/SeguimientoItem";
import {
  Card,
  EmptyState,
  Loading,
  Notice,
  PageHead,
  Segmented,
  Stat,
  StatusPill,
  View,
  btnClass,
  zs,
} from "@/presentation/ui/zs";

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "in_progress", label: "En progreso" },
  { id: "completed", label: "Completados" },
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const clp = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });

type PatientGroup = { patientId: string; patientName: string; items: SeguimientoItem[] };

type Plan = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startsAt: string;
  sessions: { total: number; completed: number; noShow: number; scheduled: number; confirmed: number; nextSessionAt: string | null };
};

/** Panel del paciente: lo mismo que el paciente ve en su portal (planes, sesiones y pagos). */
function PatientPanel({ group, onClose }: { group: PatientGroup; onClose: () => void }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plansError, setPlansError] = useState(false);

  useEffect(() => {
    let alive = true;
    setPlans(null);
    setPlansError(false);
    fetch(`/api/treatment-plans?patientId=${encodeURIComponent(group.patientId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        if (!json.ok) throw new Error(json.error);
        setPlans(json.items);
      })
      .catch(() => alive && setPlansError(true));
    return () => {
      alive = false;
    };
  }, [group.patientId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const payments = group.items.flatMap((i) => i.payments);
  const pending = payments.filter((p) => p.status === "PENDING").reduce((a, p) => a + p.amount, 0);
  const paid = payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#0d1b2a]/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label={`Seguimiento de ${group.patientName}`}
        className="fixed inset-y-0 right-0 z-50 flex w-[min(520px,100vw)] flex-col gap-5 overflow-y-auto bg-[#f4f7f9] p-6 shadow-2xl animate-fade-in"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-sm font-bold text-slate-900">
            {initialsOf(group.patientName)}
          </span>
          <div className="min-w-0 flex-1">
            <span className={zs.label}>Seguimiento</span>
            <h2 className="font-display text-2xl font-bold tracking-[-0.6px] text-slate-900">{group.patientName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-[#50c9d5]">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/patients/${group.patientId}`} className={btnClass("primary", "sm")}>
            Ver ficha completa
          </Link>
          <Link href={`/seguimiento?patientId=${group.patientId}`} className={btnClass("quiet", "sm")}>
            Solo este paciente
          </Link>
        </div>

        <Card title="Planes de tratamiento">
          {plans === null && !plansError ? <Loading label="Cargando planes…" /> : null}
          {plansError ? <p className={zs.small}>No pudimos cargar los planes con tu permiso actual.</p> : null}
          {plans && !plans.length ? <EmptyState title="Sin planes de tratamiento">Cuando se agende un plan por sesiones, verás su avance aquí.</EmptyState> : null}
          {plans?.length ? (
            <ul className="flex flex-col gap-5">
              {plans.map((plan) => {
                const total = Math.max(plan.sessions.total, 1);
                const done = plan.sessions.completed;
                const miss = plan.sessions.noShow;
                return (
                  <li key={plan.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <b className="block font-display text-[16px] font-semibold text-slate-900">{plan.name}</b>
                        <span className={zs.small}>Desde el {shortDate(plan.startsAt)}</span>
                      </div>
                      <span className="shrink-0 text-right">
                        <b className="font-display text-2xl font-bold tabular-nums text-slate-900">
                          {done}
                          <span className="text-base text-slate-500">/{plan.sessions.total}</span>
                        </b>
                        <span className="block text-[12px] text-slate-500">sesiones</span>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                      {Array.from({ length: total }, (_, i) => (
                        <i
                          key={i}
                          className={`h-2.5 flex-[1_0_14px] rounded-full ${
                            i < done
                              ? "bg-[#50c9d5]"
                              : i < done + miss
                                ? "border border-[#e8a020]/50 bg-[#e8a020]/[0.14]"
                                : i === done + miss && plan.sessions.nextSessionAt
                                  ? "border-[1.5px] border-dashed border-[#50c9d5]"
                                  : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500">
                      {plan.sessions.nextSessionAt
                        ? `Próxima sesión: ${new Date(plan.sessions.nextSessionAt).toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
                        : plan.status === "COMPLETED"
                          ? "Plan terminado."
                          : "Sin próxima sesión agendada."}
                      {miss ? ` · faltó a ${miss}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        <Card title="Tratamientos">
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 border-t border-slate-200 py-3 first:border-t-0 first:pt-0">
                <div className="min-w-0 flex-1">
                  <b className="block truncate font-display text-[14.5px] font-semibold text-slate-900">{item.treatmentName}</b>
                  <span className={zs.small}>
                    {shortDate(item.performedAt)}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </span>
                </div>
                <StatusPill tone={item.status === "completed" ? "ok" : "warn"}>{item.status === "completed" ? "Completado" : "En progreso"}</StatusPill>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Pagos">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={zs.label}>Pendiente</span>
              <b className="mt-1 block font-display text-2xl font-bold tabular-nums text-[#8a5a0b]">{clp(pending)}</b>
            </div>
            <div>
              <span className={zs.label}>Pagado</span>
              <b className="mt-1 block font-display text-2xl font-bold tabular-nums text-slate-900">{clp(paid)}</b>
            </div>
          </div>
        </Card>
      </aside>
    </>
  );
}

export default function Seguimiento() {
  const router = useRouter();
  const { state, actions } = useSeguimientoViewModel();
  const [openPatient, setOpenPatient] = useState<string | null>(null);

  // Un paciente por tarjeta, con todos sus tratamientos.
  const groups = useMemo<PatientGroup[]>(() => {
    const map = new Map<string, PatientGroup>();
    for (const item of state.filteredItems) {
      const g = map.get(item.patientId) ?? { patientId: item.patientId, patientName: item.patientName, items: [] };
      g.items.push(item);
      map.set(item.patientId, g);
    }
    return Array.from(map.values());
  }, [state.filteredItems]);

  const allGroups = useMemo(() => {
    const map = new Map<string, PatientGroup>();
    for (const item of state.items) {
      const g = map.get(item.patientId) ?? { patientId: item.patientId, patientName: item.patientName, items: [] };
      g.items.push(item);
      map.set(item.patientId, g);
    }
    return map;
  }, [state.items]);

  if (state.roleLoading) return <Loading label="Cargando seguimiento…" />;

  if (!state.hasAccess) {
    return (
      <View label="Seguimiento">
        <Notice tone="err">No tienes acceso a esta sección. Te estamos llevando a tu inicio…</Notice>
      </View>
    );
  }

  const opened = openPatient ? allGroups.get(openPatient) : undefined;

  return (
    <View label="Seguimiento" wide>
      <PageHead
        back={
          state.patientIdFilter ? (
            <button
              type="button"
              onClick={() => router.push(`/patients/${state.patientIdFilter}`)}
              aria-label="Volver a la ficha"
              className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-[#50c9d5]"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
          ) : undefined
        }
        tag="Seguimiento"
        title="Así van"
        accent="tus pacientes"
        lead={
          state.patientIdFilter
            ? "Mostrando solo los tratamientos del paciente que elegiste."
            : "Haz clic en un paciente para ver sus planes, sesiones y pagos."
        }
        actions={
          <>
            {state.patientIdFilter ? (
              <button type="button" onClick={() => router.push("/seguimiento")} className={btnClass("quiet", "sm")}>
                Ver todos
              </button>
            ) : null}
            <Segmented label="Estado" items={FILTERS} value={state.filter} onChange={actions.setFilter} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tratamientos" value={state.stats.total} icon={Activity} />
        <Stat label="En progreso" value={state.stats.inProgress} icon={Clock} />
        <Stat label="Completados" value={state.stats.completed} icon={CheckCircle2} />
        <Stat label="Pagos pendientes" value={state.stats.pendingPayments} icon={CreditCard} />
      </div>

      {state.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : state.error ? (
        <Notice tone="err">{state.error}</Notice>
      ) : !groups.length ? (
        <Card>
          <EmptyState title="No hay tratamientos en seguimiento">Cuando registres un tratamiento a un paciente, aparecerá aquí.</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {groups.map((g, idx) => {
            const inProgress = g.items.filter((i) => i.status === "in_progress").length;
            const pendingPays = g.items.flatMap((i) => i.payments).filter((p) => p.status === "PENDING").length;
            return (
              <button
                key={g.patientId}
                type="button"
                onClick={() => setOpenPatient(g.patientId)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`${zs.card} animate-card-in text-left transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#50c9d5] hover:shadow-md`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-xs font-bold text-slate-900">
                    {initialsOf(g.patientName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-display text-[16px] font-semibold text-slate-900">{g.patientName}</b>
                    <span className={zs.small}>
                      {g.items.length} {g.items.length === 1 ? "tratamiento" : "tratamientos"}
                    </span>
                  </div>
                </div>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {g.items.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                      <span className="truncate text-slate-600">{item.treatmentName}</span>
                      <StatusPill tone={item.status === "completed" ? "ok" : "warn"}>{item.status === "completed" ? "Listo" : "En curso"}</StatusPill>
                    </li>
                  ))}
                  {g.items.length > 3 ? <li className={zs.small}>+{g.items.length - 3} más</li> : null}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 text-[12.5px] text-slate-500">
                  <span>{inProgress} en curso</span>
                  {pendingPays ? <span className="text-[#8a5a0b]">· {pendingPays} pago{pendingPays > 1 ? "s" : ""} pendiente{pendingPays > 1 ? "s" : ""}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {opened ? <PatientPanel group={opened} onClose={() => setOpenPatient(null)} /> : null}
    </View>
  );
}
