"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  Database,
  Grid2x2,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { SuperAdminClinicRow, SuperAdminPlatformData } from "./platformTypes";
import { MODULE_COLORS, PLATFORM_MODULES, moduleLabel } from "./platformConstants";
import {
  Badge,
  displayUserName,
  EmptyState,
  formatDate,
  formatNumber,
  getInitials,
  PageHeader,
  ProgressBar,
  StatTile,
} from "./SuperAdminPrimitives";

type DetailTab = "overview" | "modules" | "users" | "resources" | "settings";

function planTone(plan: string): "teal" | "amber" | "slate" | "rose" {
  if (plan === "Pro") return "teal";
  if (plan === "Trial") return "amber";
  if (plan === "Inactiva") return "rose";
  return "slate";
}

function statusTone(isActive: boolean): "emerald" | "rose" {
  return isActive ? "emerald" : "rose";
}

function ClinicCard({ clinic, onOpen }: { clinic: SuperAdminClinicRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
    >
      <div className="h-1 rounded-t-xl bg-[#0e88ab]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-lg font-black text-[#0e88ab]">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950">{clinic.name}</p>
              <p className="mt-1 truncate text-sm text-slate-500">{clinic.city || "Sin ciudad"}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge tone={statusTone(clinic.isActive)}>{clinic.isActive ? "Activa" : "Inactiva"}</Badge>
            <Badge tone={planTone(clinic.plan)}>{clinic.plan}</Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniStat label="Usuarios" value={clinic.totalUsers} />
          <MiniStat label="Modulos" value={clinic.activeModules.length} />
          <MiniStat label="DB" value={`${clinic.resources.usagePercent}%`} />
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {clinic.activeModules.slice(0, 4).map((permission) => (
            <span
              key={permission}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${MODULE_COLORS[permission]}`}
            >
              {moduleLabel(permission)}
            </span>
          ))}
          {clinic.activeModules.length > 4 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              +{clinic.activeModules.length - 4}
            </span>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-slate-500">Registros en BD</span>
            <span className="font-semibold text-slate-700">{formatNumber(clinic.resources.totalRecords)}</span>
          </div>
          <ProgressBar value={clinic.resources.usagePercent} tone="teal" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-xs text-slate-500">Creada {formatDate(clinic.createdAt)}</span>
        <span className="text-xs font-semibold text-[#0e88ab] transition group-hover:translate-x-0.5">Configurar</span>
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
      <p className="text-lg font-bold leading-none text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
    </div>
  );
}

function DetailTabs({
  active,
  onChange,
}: {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  const tabs: Array<{ id: DetailTab; label: string; icon: typeof Grid2x2 }> = [
    { id: "overview", label: "Resumen", icon: Grid2x2 },
    { id: "modules", label: "Modulos", icon: ShieldCheck },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "resources", label: "Recursos", icon: Database },
    { id: "settings", label: "Configuracion", icon: Settings },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              selected
                ? "border-[#0e88ab] text-[#0e88ab]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ClinicDetail({ clinic, onBack }: { clinic: SuperAdminClinicRow; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>("overview");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Clinicas
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 text-lg font-black text-[#0e88ab]">
            {clinic.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{clinic.name}</h1>
            <p className="text-sm text-slate-500">
              {clinic.city || "Sin ciudad"} - creada {formatDate(clinic.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(clinic.isActive)}>{clinic.isActive ? "Activa" : "Inactiva"}</Badge>
          <Badge tone={planTone(clinic.plan)}>{clinic.plan}</Badge>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DetailTabs active={tab} onChange={setTab} />
        <div className="p-5">
          {tab === "overview" && <ClinicOverview clinic={clinic} />}
          {tab === "modules" && <ClinicModules clinic={clinic} />}
          {tab === "users" && <ClinicUsers clinic={clinic} />}
          {tab === "resources" && <ClinicResources clinic={clinic} />}
          {tab === "settings" && <ClinicSettings clinic={clinic} />}
        </div>
      </section>
    </div>
  );
}

function ClinicOverview({ clinic }: { clinic: SuperAdminClinicRow }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Usuarios" value={clinic.totalUsers} sub={`${clinic.activeUsers} activos`} icon={Users} tone="cyan" />
        <StatTile label="Modulos" value={clinic.activeModules.length} sub={`de ${PLATFORM_MODULES.length}`} icon={Grid2x2} tone="violet" />
        <StatTile label="Pacientes" value={clinic.resources.patients} icon={Users} tone="emerald" />
        <StatTile label="Registros" value={formatNumber(clinic.resources.totalRecords)} icon={Database} tone="teal" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Equipo activo</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label="Admins" value={clinic.admins} />
            <MiniStat label="Medicos" value={clinic.doctors} />
            <MiniStat label="Recepcion" value={clinic.secretaries} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Uso relativo de datos</h3>
          <p className="mt-2 text-3xl font-bold text-slate-950">{clinic.resources.usagePercent}%</p>
          <ProgressBar value={clinic.resources.usagePercent} tone={clinic.resources.usagePercent > 75 ? "rose" : "teal"} />
        </div>
      </div>
    </div>
  );
}

function ClinicModules({ clinic }: { clinic: SuperAdminClinicRow }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {PLATFORM_MODULES.map((module) => {
        const active = clinic.activeModules.includes(module.key);
        return (
          <div key={module.key} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{module.label}</p>
                <p className="mt-1 text-xs text-slate-500">{module.description}</p>
              </div>
              <Badge tone={active ? "teal" : "slate"}>{active ? "Activo" : "Sin acceso"}</Badge>
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              {module.category}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClinicUsers({ clinic }: { clinic: SuperAdminClinicRow }) {
  if (clinic.users.length === 0) {
    return <EmptyState title="Sin usuarios asignados">Esta clinica todavia no tiene miembros activos.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.08em] text-slate-400">
            <th className="px-3 py-3 font-semibold">Usuario</th>
            <th className="px-3 py-3 font-semibold">Rol</th>
            <th className="px-3 py-3 font-semibold">Estado</th>
            <th className="px-3 py-3 font-semibold">Software</th>
            <th className="px-3 py-3 font-semibold">Ultimo acceso</th>
          </tr>
        </thead>
        <tbody>
          {clinic.users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0e88ab] text-xs font-bold text-white">
                    {getInitials(displayUserName(user))}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{displayUserName(user)}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <Badge tone={user.isSuperAdmin ? "rose" : user.role === "ADMIN" ? "teal" : "slate"}>
                  {user.isSuperAdmin ? "Super Admin" : user.role}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <Badge tone={user.status === "ACTIVE" ? "emerald" : "amber"}>{user.status}</Badge>
              </td>
              <td className="px-3 py-3 text-slate-600">{user.usesNewPlatform ? "Nuevo" : "Clasico"}</td>
              <td className="px-3 py-3 text-slate-500">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Sin login"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClinicResources({ clinic }: { clinic: SuperAdminClinicRow }) {
  const rows = [
    ["Pacientes", clinic.resources.patients],
    ["Citas", clinic.resources.appointments],
    ["Atenciones", clinic.resources.clinicalVisits],
    ["Observaciones", clinic.resources.observations],
    ["Fichas", clinic.resources.clinicalRecords],
    ["Plantillas", clinic.resources.formTemplates],
    ["Leads CRM", clinic.resources.leads],
    ["Alertas", clinic.resources.alerts],
    ["Movimientos caja", clinic.resources.cashMovements],
    ["Boxes", clinic.resources.boxes],
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ClinicSettings({ clinic }: { clinic: SuperAdminClinicRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-950">General</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <SettingLine label="Nombre" value={clinic.name} />
          <SettingLine label="Ciudad" value={clinic.city || "Sin ciudad"} />
          <SettingLine label="Estado" value={clinic.isActive ? "Activa" : "Inactiva"} />
          <SettingLine label="Plan operativo" value={clinic.plan} />
        </dl>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Auditoria</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <SettingLine label="Creada" value={formatDate(clinic.createdAt)} />
          <SettingLine label="Actualizada" value={formatDate(clinic.updatedAt)} />
          <SettingLine label="Miembros" value={String(clinic.totalUsers)} />
          <SettingLine label="Registros" value={formatNumber(clinic.resources.totalRecords)} />
        </dl>
      </div>
    </div>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default function SuperAdminClinics({ data }: { data: SuperAdminPlatformData }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data.clinics.find((clinic) => clinic.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return data.clinics.filter((clinic) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        clinic.name.toLowerCase().includes(normalizedSearch) ||
        clinic.city.toLowerCase().includes(normalizedSearch);
      const matchesPlan = plan === "all" || clinic.plan === plan;
      return matchesSearch && matchesPlan;
    });
  }, [data.clinics, plan, search]);

  if (selected) {
    return <ClinicDetail clinic={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Clinicas"
        description="Sedes registradas, usuarios, modulos y recursos conectados a la base."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Registradas" value={data.stats.totalClinics} icon={Building2} tone="cyan" />
        <StatTile label="Activas" value={data.stats.activeClinics} icon={ShieldCheck} tone="emerald" />
        <StatTile label="En trial" value={data.stats.activeTrials} icon={CalendarDays} tone="amber" />
        <StatTile label="Registros" value={formatNumber(data.stats.totalRecords)} icon={Database} tone="violet" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar clinica o ciudad..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[#0e88ab] focus:bg-white"
          />
        </div>
        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#0e88ab]"
        >
          <option value="all">Todos los planes</option>
          <option value="Trial">Trial</option>
          <option value="Starter">Starter</option>
          <option value="Pro">Pro</option>
          <option value="Inactiva">Inactiva</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin clinicas">No hay resultados para esos filtros.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} onOpen={() => setSelectedId(clinic.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
