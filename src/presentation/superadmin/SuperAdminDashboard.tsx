"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Building2,
  CalendarCheck,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { DashClinicRow, DashboardData } from "@/server/super-admin/dashboardCalc";
import { Badge, EmptyState, PageHeader, StatTile } from "./SuperAdminPrimitives";
import { ActionDialog, type ActionKind } from "./dashboard/ClinicActions";
import ClinicPanel from "./dashboard/ClinicPanel";
import ClinicsTable from "./dashboard/ClinicsTable";
import CostsModal from "./dashboard/CostsModal";
import CreateClinicModal from "./dashboard/CreateClinicModal";
import { BarChart, DonutChart, LineChart } from "./dashboard/charts";
import { STATUS_COLOR, STATUS_LABEL, api, clp, dateLabel, monthLabel, num, pct, signedPct, statusTone } from "./dashboard/format";
import { btnGhost, btnPrimary, inputClass } from "./dashboard/ui";

type Filters = { months: 3 | 6 | 12; plan: string; status: string; city: string; q: string };
const DEFAULT_FILTERS: Filters = { months: 6, plan: "", status: "", city: "", q: "" };

const PLAN_COLORS = ["#0e88ab", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TopList({ rows, empty, value, sub, onOpen }: { rows: DashClinicRow[]; empty: string; value: (r: DashClinicRow) => string; sub: (r: DashClinicRow) => string; onOpen: (id: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.id}>
          <button type="button" onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{r.name}</span>
              <span className="block truncate text-xs text-slate-500">{sub(r)}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{value(r)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function SuperAdminDashboard() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [qInput, setQInput] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DashClinicRow | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const [pending, setPending] = useState<{ row: DashClinicRow; kind: ActionKind } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const optionsRef = useRef<DashboardData["options"]>({ plans: [], cities: [] });

  // La busqueda por nombre espera un momento antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === qInput.trim() ? f : { ...f, q: qInput.trim() })), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ months: String(filters.months) });
    if (filters.plan) params.set("plan", filters.plan);
    if (filters.status) params.set("status", filters.status);
    if (filters.city) params.set("city", filters.city);
    if (filters.q) params.set("q", filters.q);
    setLoading(true);
    api<{ data: DashboardData }>(`/api/super-admin/dashboard?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => {
        optionsRef.current = r.data.options;
        setData(r.data);
        setError(null);
        setSelected((cur) => (cur ? r.data.clinics.find((c) => c.id === cur.id) ?? cur : cur));
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "No se pudo cargar el dashboard.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [filters, reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback((message?: string) => {
    if (message) setToast(message);
    setReload((n) => n + 1);
    setPanelKey((n) => n + 1);
  }, []);

  const open = useCallback(
    (id: string) => {
      const row = data?.clinics.find((c) => c.id === id);
      if (row) setSelected(row);
    },
    [data]
  );

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const hasFilters = Boolean(filters.plan || filters.status || filters.city || filters.q);
  const clearFilters = () => {
    setQInput("");
    setFilters((f) => ({ ...DEFAULT_FILTERS, months: f.months }));
  };

  const k = data?.kpis;
  const months = data?.months ?? [];
  const range = filters.months;
  const showCosts_ = data ? !data.filtersActive : true;

  const mrrPoints = useMemo(
    () =>
      months.map((m) => ({
        label: monthLabel(m.month),
        tooltipLabel: monthLabel(m.month, true),
        values: { mrr: m.mrr, costs: m.costs, margin: m.margin },
      })),
    [months]
  );
  const flowPoints = useMemo(
    () =>
      months.map((m) => ({
        label: monthLabel(m.month),
        tooltipLabel: monthLabel(m.month, true),
        values: { added: m.newClinics, lost: m.churnedClinics, net: m.netClinics },
      })),
    [months]
  );
  const ratePoints = useMemo(
    () =>
      months.map((m) => ({
        label: monthLabel(m.month),
        tooltipLabel: monthLabel(m.month, true),
        values: { growth: m.mrrGrowth === null ? null : m.mrrGrowth * 100, churn: m.churnRate === null ? null : m.churnRate * 100 },
      })),
    [months]
  );
  const usagePoints = useMemo(
    () =>
      months.map((m) => ({
        label: monthLabel(m.month),
        tooltipLabel: monthLabel(m.month, true),
        values: { appointments: m.appointments, patients: m.newPatients },
      })),
    [months]
  );

  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Super Admin" title="Dashboard" />
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
          <div className="mt-3">
            <button type="button" className={btnGhost} onClick={() => refresh()}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Dashboard"
        description="Ingresos, clientes y uso de la plataforma. Todo sale de la base de datos; los filtros actualizan indicadores, graficas y tabla."
        actions={
          <>
            <button type="button" className={btnGhost} onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button type="button" className={btnGhost} onClick={() => setShowCosts(true)}>
              <Settings2 className="h-4 w-4" />
              Costos de plataforma
            </button>
            <button type="button" className={btnPrimary} onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Nueva sede
            </button>
          </>
        }
      />

      {toast && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
          <button type="button" onClick={() => setToast(null)} aria-label="Cerrar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && data && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error} (se muestran los ultimos datos cargados)
        </div>
      )}

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1.4fr_auto]">
          <div className="flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Rango de meses">
            {([3, 6, 12] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={range === m}
                onClick={() => setFilter("months", m)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition ${range === m ? "bg-[#0e88ab] text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {m} meses
              </button>
            ))}
          </div>
          <select aria-label="Plan" className={inputClass} value={filters.plan} onChange={(e) => setFilter("plan", e.target.value)}>
            <option value="">Todos los planes</option>
            {optionsRef.current.plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select aria-label="Estado comercial" className={inputClass} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="TRIAL">En prueba</option>
            <option value="ACTIVE">Activa</option>
            <option value="PAST_DUE">Morosa</option>
            <option value="CANCELED">Cancelada</option>
            <option value="SUSPENDED">Sin acceso (suspendida)</option>
          </select>
          <select aria-label="Ciudad" className={inputClass} value={filters.city} onChange={(e) => setFilter("city", e.target.value)}>
            <option value="">Todas las ciudades</option>
            {optionsRef.current.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Buscar sede por nombre"
              placeholder="Buscar sede por nombre"
              className={`${inputClass} pl-9`}
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              maxLength={80}
            />
          </div>
          <button type="button" className={btnGhost} onClick={clearFilters} disabled={!hasFilters && qInput === ""}>
            Limpiar
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {data ? `${data.totals.filteredClinics} de ${data.totals.allClinics} sedes` : "Cargando..."}. MRR, estados y trials son de hoy;
          altas, bajas y graficas cubren los ultimos {range} meses.
          {data?.filtersActive && " Con filtros de sede no se muestran costos ni margen: los costos son de toda la plataforma."}
        </p>
      </section>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Cargando">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      ) : data.totals.allClinics === 0 ? (
        <EmptyState title="Todavia no hay sedes">Crea la primera con el boton Nueva sede.</EmptyState>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* Dinero */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="MRR" value={clp(k!.mrr)} sub={`${signedPct(k!.mrrGrowth)} vs mes anterior`} icon={Banknote} tone="teal" />
            <StatTile label="ARR" value={clp(k!.arr)} sub="MRR x 12" icon={Wallet} tone="cyan" />
            <StatTile
              label="Ingreso por sede"
              value={k!.arpa === null ? "-" : clp(k!.arpa)}
              sub={`ARPA entre ${k!.payingClinics} que pagan. Promedio de todas: ${k!.avgRevenuePerClinic === null ? "-" : clp(k!.avgRevenuePerClinic)}`}
              icon={Building2}
              tone="violet"
            />
            <StatTile
              label="Margen del mes"
              value={k!.margin === null ? "-" : clp(k!.margin)}
              sub={k!.margin === null ? "Quita los filtros de sede para verlo" : `${pct(k!.marginPercent)} del MRR, costos ${clp(k!.costs ?? 0)}`}
              icon={Percent}
              tone={k!.margin !== null && k!.margin < 0 ? "amber" : "emerald"}
            />
          </div>

          {/* Clientes */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Churn del mes"
              value={pct(k!.churnRate)}
              sub={`${k!.churnedClinics} baja(s), ${clp(k!.churnedMrr)}. En ${range} meses: ${k!.churnedClinicsRange} bajas, ${k!.newClinicsRange} altas`}
              icon={TrendingDown}
              tone="rose"
            />
            <StatTile label="Morosas" value={k!.pastDueClinics} sub={`${clp(k!.mrrAtRisk)} de MRR en riesgo`} icon={AlertTriangle} tone="amber" />
            <StatTile label="En prueba" value={k!.trialClinics} sub={`${k!.trialsExpiringSoon} vencen en 7 dias`} icon={TrendingUp} tone="cyan" />
            <StatTile label="Sin acceso" value={k!.suspendedClinics} sub={`${k!.canceledClinics} canceladas`} icon={Building2} tone="slate" />
          </div>

          {/* Uso */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Citas del mes" value={num(k!.appointmentsMonth)} sub="sin contar canceladas" icon={CalendarCheck} tone="teal" />
            <StatTile label="Pacientes nuevos" value={num(k!.newPatientsMonth)} sub={`${num(k!.patients)} pacientes en total`} icon={UserPlus} tone="emerald" />
            <StatTile label="Usuarios" value={num(k!.users)} sub="de las sedes, sin super admin" icon={Users} tone="violet" />
            <StatTile label="Activos en 30 dias" value={num(k!.activeUsers30d)} sub={`${k!.users ? Math.round((k!.activeUsers30d / k!.users) * 100) : 0}% de los usuarios`} icon={Activity} tone="cyan" />
          </div>

          {/* Graficas */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Ingresos, costos y margen" subtitle="MRR al cierre de cada mes">
              <LineChart
                ariaLabel="MRR, costos y margen por mes"
                yFormat={(v) => clp(v)}
                points={mrrPoints}
                series={[
                  { key: "mrr", label: "MRR", color: "#0e88ab", format: clp },
                  ...(showCosts_
                    ? [
                        { key: "costs", label: "Costos", color: "#f59e0b", format: clp },
                        { key: "margin", label: "Margen", color: "#10b981", format: clp },
                      ]
                    : []),
                ]}
              />
            </Card>
            <Card title="Altas y bajas por mes" subtitle="Sedes que empiezan a pagar y sedes canceladas">
              <BarChart
                ariaLabel="Altas y bajas de sedes por mes"
                yFormat={(v) => String(Math.round(v))}
                points={flowPoints}
                series={[
                  { key: "added", label: "Altas", color: "#10b981" },
                  { key: "lost", label: "Bajas", color: "#f43f5e" },
                  { key: "net", label: "Neto", color: "#94a3b8" },
                ].map((s) => ({ ...s, format: (v: number) => String(v) }))}
              />
            </Card>
            <Card title="Crecimiento del MRR y churn" subtitle="En porcentaje respecto del mes anterior">
              <LineChart
                ariaLabel="Crecimiento del MRR y churn por mes"
                yFormat={(v) => `${v.toFixed(0)}%`}
                points={ratePoints}
                series={[
                  { key: "growth", label: "Crecimiento MRR", color: "#8b5cf6", format: (v) => `${v.toFixed(1)}%` },
                  { key: "churn", label: "Churn", color: "#f43f5e", format: (v) => `${v.toFixed(1)}%` },
                ]}
              />
            </Card>
            <Card title="Uso de la plataforma" subtitle="Citas (sin canceladas) y pacientes nuevos por mes">
              <BarChart
                ariaLabel="Citas y pacientes nuevos por mes"
                points={usagePoints}
                series={[
                  { key: "appointments", label: "Citas", color: "#0e88ab", format: num },
                  { key: "patients", label: "Pacientes nuevos", color: "#8b5cf6", format: num },
                ]}
              />
            </Card>
            <Card title="Sedes por estado comercial" subtitle="Haz clic en un segmento para filtrar la tabla">
              <DonutChart
                ariaLabel="Distribucion de sedes por estado"
                centerLabel="sedes"
                selectedKey={filters.status || null}
                onSelect={(key) => setFilter("status", filters.status === key ? "" : key)}
                slices={data.statusDistribution.map((s) => ({
                  key: s.status,
                  label: STATUS_LABEL[s.status],
                  value: s.clinics,
                  color: STATUS_COLOR[s.status],
                  sub: s.mrr > 0 ? clp(s.mrr) : undefined,
                }))}
              />
            </Card>
            <Card title="MRR por plan" subtitle="Sedes que pagan hoy. Haz clic para filtrar por plan">
              {data.planDistribution.length === 0 ? (
                <p className="text-sm text-slate-500">Ninguna sede paga con estos filtros.</p>
              ) : (
                <DonutChart
                  ariaLabel="MRR por plan"
                  centerLabel="MRR"
                  valueFormat={(v) => clp(v)}
                  selectedKey={filters.plan || null}
                  onSelect={(key) => setFilter("plan", filters.plan === key ? "" : key)}
                  slices={data.planDistribution.map((p, i) => ({
                    key: p.plan,
                    label: p.plan,
                    value: p.mrr,
                    color: PLAN_COLORS[i % PLAN_COLORS.length],
                    sub: `${p.clinics} sede${p.clinics === 1 ? "" : "s"}`,
                  }))}
                />
              )}
            </Card>
          </div>

          {/* Rankings */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Top por ingreso" subtitle="Precio mensual de las sedes que pagan">
              <TopList
                rows={data.topByRevenue}
                empty="Ninguna sede paga con estos filtros."
                value={(r) => clp(r.monthlyPrice)}
                sub={(r) => `${r.plan} - ${r.city}`}
                onOpen={open}
              />
            </Card>
            <Card title="Top por uso" subtitle="Citas del mes en curso">
              <TopList
                rows={data.topByUsage}
                empty="Sin actividad registrada."
                value={(r) => `${num(r.appointmentsMonth)} citas`}
                sub={(r) => `${num(r.patients)} pacientes, ${r.activeUsers} usuarios`}
                onOpen={open}
              />
            </Card>
            <Card title="Pruebas por vencer" subtitle="Ordenadas por fecha de termino">
              <TopList
                rows={data.expiringTrials}
                empty="No hay sedes en prueba."
                value={(r) => (r.trialDaysLeft! < 0 ? `Vencio hace ${-r.trialDaysLeft!} d` : `${r.trialDaysLeft} d`)}
                sub={(r) => `Termina el ${dateLabel(r.trialEndsAt)}`}
                onOpen={open}
              />
            </Card>
          </div>

          {/* Tabla */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Sedes y clientes</h2>
                <p className="text-sm text-slate-500">Ordena por columna, abre el detalle o usa el menu de acciones de cada fila.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["ACTIVE", "TRIAL", "PAST_DUE", "CANCELED"] as const).map((s) => (
                  <Badge key={s} tone={statusTone(s)}>
                    {STATUS_LABEL[s]}: {data.statusDistribution.find((x) => x.status === s)?.clinics ?? 0}
                  </Badge>
                ))}
              </div>
            </div>
            <ClinicsTable rows={data.clinics} selectedId={selected?.id ?? null} onOpen={open} onPick={(row, kind) => setPending({ row, kind })} />
          </section>
        </div>
      )}

      {selected && (
        <ClinicPanel
          row={selected}
          refreshKey={panelKey}
          onClose={() => setSelected(null)}
          onPick={(kind) => setPending({ row: selected, kind })}
          onSaved={(m) => refresh(m)}
        />
      )}
      {pending && (
        <ActionDialog
          target={pending.row}
          kind={pending.kind}
          onClose={() => setPending(null)}
          onDone={(m) => refresh(`${m}. Registrado en la auditoria.`)}
        />
      )}
      {showCreate && <CreateClinicModal plans={optionsRef.current.plans} onClose={() => setShowCreate(false)} onCreated={(m) => refresh(m)} />}
      {showCosts && <CostsModal onClose={() => setShowCosts(false)} onChanged={(m) => refresh(m)} />}
    </div>
  );
}
