"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Shield, UserCog, Users, XCircle } from "lucide-react";
import type { SuperAdminPlatformData, SuperAdminRoleRow } from "./platformTypes";
import { MODULE_COLORS, PLATFORM_MODULES, type PlatformRole } from "./platformConstants";
import { Badge, EmptyState, PageHeader, ProgressBar, StatTile } from "./SuperAdminPrimitives";

const ROLE_ORDER: PlatformRole[] = ["SUPER_ADMIN", "ADMIN", "DOCTOR", "SECRETARY"];

function roleTone(role: PlatformRole): "rose" | "teal" | "violet" | "slate" {
  if (role === "SUPER_ADMIN") return "rose";
  if (role === "ADMIN") return "teal";
  if (role === "DOCTOR") return "violet";
  return "slate";
}

function RoleCard({
  role,
  active,
  onClick,
}: {
  role: SuperAdminRoleRow;
  active: boolean;
  onClick: () => void;
}) {
  const totalPermissions = role.permissions.length;
  const enabledPermissions = role.permissions.filter((permission) => permission.enabledUsers > 0).length;
  const pct = totalPermissions ? Math.round((enabledPermissions / totalPermissions) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${
        active ? "border-[#0e88ab] bg-cyan-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={roleTone(role.role)}>{role.label}</Badge>
            {role.role === "SUPER_ADMIN" && <Badge tone="slate">Sistema</Badge>}
          </div>
          <p className="mt-2 text-sm text-slate-500">{role.description}</p>
        </div>
        <span className="text-sm font-bold text-slate-700">{role.users}</span>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{enabledPermissions}/{totalPermissions} modulos</span>
          <span>{pct}%</span>
        </div>
        <ProgressBar value={pct} tone={roleTone(role.role) === "rose" ? "rose" : "teal"} />
      </div>
    </button>
  );
}

export default function SuperAdminRoles({ data }: { data: SuperAdminPlatformData }) {
  const orderedRoles = useMemo(
    () => ROLE_ORDER.map((role) => data.roles.find((item) => item.role === role)).filter((role): role is SuperAdminRoleRow => Boolean(role)),
    [data.roles]
  );
  const [activeRole, setActiveRole] = useState<PlatformRole>(orderedRoles[0]?.role ?? "ADMIN");

  const selectedRole = orderedRoles.find((role) => role.role === activeRole) ?? orderedRoles[0] ?? null;
  const totalActive = data.roles.reduce((sum, role) => sum + role.activeUsers, 0);
  const totalSuspended = data.roles.reduce((sum, role) => sum + role.suspendedUsers, 0);

  if (!selectedRole) {
    return <EmptyState title="Sin roles">No hay roles disponibles.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Roles y Permisos"
        description="Resumen real de roles, usuarios y permisos asignados en la base."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Roles" value={orderedRoles.length} icon={Shield} tone="cyan" />
        <StatTile label="Usuarios activos" value={totalActive} icon={Users} tone="emerald" />
        <StatTile label="Suspendidos" value={totalSuspended} icon={XCircle} tone="rose" />
        <StatTile label="Permisos" value={PLATFORM_MODULES.length} icon={UserCog} tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {orderedRoles.map((role) => (
            <RoleCard key={role.role} role={role} active={role.role === activeRole} onClick={() => setActiveRole(role.role)} />
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={roleTone(selectedRole.role)}>{selectedRole.label}</Badge>
                <span className="text-sm font-semibold text-slate-500">{selectedRole.users} usuarios</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{selectedRole.description}</p>
            </div>
            <div className="text-sm text-slate-500">
              {selectedRole.activeUsers} activos / {selectedRole.suspendedUsers} no activos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-5 py-3 font-semibold">Modulo</th>
                  <th className="px-5 py-3 font-semibold">Categoria</th>
                  <th className="px-5 py-3 font-semibold">Usuarios con acceso</th>
                  <th className="px-5 py-3 font-semibold">Cobertura</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_MODULES.map((module) => {
                  const permission = selectedRole.permissions.find((item) => item.key === module.key);
                  const enabledPercent = permission?.enabledPercent ?? 0;
                  const enabledUsers = permission?.enabledUsers ?? 0;
                  const isEnabled = enabledUsers > 0;
                  return (
                    <tr key={module.key} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${MODULE_COLORS[module.key]}`}>
                            {module.label}
                          </span>
                          <p className="mt-2 text-xs text-slate-500">{module.description}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{module.category}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {enabledUsers}/{permission?.totalUsers ?? selectedRole.users}
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-[140px]">
                          <ProgressBar value={enabledPercent} tone={isEnabled ? "teal" : "slate"} />
                          <p className="mt-1 text-xs text-slate-500">{enabledPercent}%</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          {isEnabled ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-300" />
                          )}
                          {isEnabled ? "Asignado" : "Sin usuarios"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
