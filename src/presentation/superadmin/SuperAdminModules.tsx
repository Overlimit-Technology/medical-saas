"use client";

import { useState } from "react";
import { Check, Grid2x2, Shield, Users, X } from "lucide-react";
import type { SuperAdminPlatformData } from "./platformTypes";
import { MODULE_ACCENTS, MODULE_COLORS, PLATFORM_MODULES, ROLE_LABELS, type PlatformRole } from "./platformConstants";
import { formatNumber, PageHeader, ProgressBar, StatTile } from "./SuperAdminPrimitives";

type ViewMode = "clinics" | "roles";

function Segment({
  value,
  active,
  children,
  onClick,
}: {
  value: ViewMode;
  active: ViewMode;
  children: React.ReactNode;
  onClick: (value: ViewMode) => void;
}) {
  const selected = value === active;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
        selected ? "bg-[#0e88ab] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function SuperAdminModules({ data }: { data: SuperAdminPlatformData }) {
  const [view, setView] = useState<ViewMode>("clinics");
  const activeModules = data.modules.filter((module) => module.clinicsEnabled > 0).length;
  const totalAssignments = data.modules.reduce((sum, module) => sum + module.usersEnabled, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Acceso a Modulos"
        description="Matriz real de permisos por clinica y por rol, calculada desde los usuarios de la base."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Segment value="clinics" active={view} onClick={setView}>
              Por clinica
            </Segment>
            <Segment value="roles" active={view} onClick={setView}>
              Por rol
            </Segment>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Modulos" value={data.modules.length} icon={Grid2x2} tone="cyan" />
        <StatTile label="Con uso" value={activeModules} icon={Check} tone="emerald" />
        <StatTile label="Asignaciones" value={formatNumber(totalAssignments)} icon={Users} tone="violet" />
        <StatTile label="Clinicas" value={data.clinics.length} icon={Shield} tone="teal" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {data.modules.map((module) => {
          const pct = data.clinics.length ? Math.round((module.clinicsEnabled / data.clinics.length) * 100) : 0;
          return (
            <section key={module.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${MODULE_COLORS[module.key]}`}>
                    {module.label}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">{module.category}</p>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${MODULE_ACCENTS[module.key]}`} />
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-950">
                {module.clinicsEnabled}/{data.clinics.length}
              </p>
              <ProgressBar value={pct} tone="teal" />
              <p className="mt-2 text-xs text-slate-500">{module.usersEnabled} usuarios con acceso</p>
            </section>
          );
        })}
      </div>

      {view === "clinics" ? <ClinicMatrix data={data} /> : <RoleMatrix data={data} />}
    </div>
  );
}

function ClinicMatrix({ data }: { data: SuperAdminPlatformData }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Matriz por clinica</h2>
        <p className="mt-1 text-sm text-slate-500">Un modulo queda activo cuando al menos un usuario de la clinica tiene ese permiso.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
              <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 font-semibold">Clinica</th>
              {PLATFORM_MODULES.map((module) => (
                <th key={module.key} className="px-3 py-3 text-center font-semibold">
                  {module.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.clinics.map((clinic) => (
              <tr key={clinic.id} className="border-b border-slate-100 last:border-b-0">
                <td className="sticky left-0 z-10 bg-white px-5 py-4">
                  <p className="font-semibold text-slate-950">{clinic.name}</p>
                  <p className="text-xs text-slate-500">{clinic.activeModules.length} modulos activos</p>
                </td>
                {PLATFORM_MODULES.map((module) => {
                  const enabled = clinic.activeModules.includes(module.key);
                  return (
                    <td key={module.key} className="px-3 py-4 text-center">
                      <span
                        className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                          enabled ? `${MODULE_COLORS[module.key]} ring-1` : "bg-slate-100 text-slate-300"
                        }`}
                      >
                        {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoleMatrix({ data }: { data: SuperAdminPlatformData }) {
  const roles = data.roles.filter((role) => role.users > 0 || role.role === "SUPER_ADMIN");
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Matriz por rol</h2>
        <p className="mt-1 text-sm text-slate-500">Cobertura porcentual de usuarios con cada permiso.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
              <th className="px-5 py-3 font-semibold">Modulo</th>
              {roles.map((role) => (
                <th key={role.role} className="px-4 py-3 text-center font-semibold">
                  {ROLE_LABELS[role.role as PlatformRole]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.modules.map((module) => (
              <tr key={module.key} className="border-b border-slate-100 last:border-b-0">
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${MODULE_COLORS[module.key]}`}>
                    {module.label}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">{module.description}</p>
                </td>
                {roles.map((role) => {
                  const access = module.roleAccess.find((item) => item.role === role.role);
                  return (
                    <td key={role.role} className="px-4 py-4 text-center">
                      <div className="mx-auto w-[110px]">
                        <ProgressBar value={access?.enabledPercent ?? 0} tone={(access?.enabledPercent ?? 0) > 0 ? "teal" : "slate"} />
                        <p className="mt-1 text-xs text-slate-500">
                          {access?.enabledUsers ?? 0}/{access?.totalUsers ?? 0}
                        </p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
