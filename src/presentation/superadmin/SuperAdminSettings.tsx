"use client";

import Link from "next/link";
import { Database, KeyRound, Settings, Shield, Users } from "lucide-react";
import type { SuperAdminPlatformData } from "./platformTypes";
import { formatDate, formatNumber, PageHeader, StatTile } from "./SuperAdminPrimitives";

function SettingCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-[#0e88ab]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="mt-5 divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function SettingLine({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition hover:bg-slate-50">
      {content}
    </Link>
  );
}

export default function SuperAdminSettings({ data }: { data: SuperAdminPlatformData }) {
  const suspendedUsers = data.users.filter((user) => user.status !== "ACTIVE").length;
  const classicUsers = data.users.filter((user) => !user.usesNewPlatform).length;
  const activeModuleCount = data.modules.filter((module) => module.clinicsEnabled > 0).length;
  const superAdmins = data.users.filter((user) => user.isSuperAdmin).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Configuracion"
        description="Vista operacional de configuracion, seguridad y estado global de Zensya."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Clinicas" value={data.stats.totalClinics} icon={Settings} tone="cyan" />
        <StatTile label="Super admins" value={superAdmins} icon={Shield} tone="rose" />
        <StatTile label="Modulos usados" value={activeModuleCount} icon={KeyRound} tone="violet" />
        <StatTile label="Registros" value={formatNumber(data.stats.totalRecords)} icon={Database} tone="teal" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingCard title="General" icon={Settings}>
          <SettingLine label="Nombre plataforma" value="Zensya" />
          <SettingLine label="Clinicas activas" value={`${data.stats.activeClinics}/${data.stats.totalClinics}`} href="/super-admin/clinicas" />
          <SettingLine label="Ultima lectura" value={formatDate(data.generatedAt, { dateStyle: "medium", timeStyle: "short" })} />
          <SettingLine label="Trials activos" value={data.stats.activeTrials} href="/super-admin/trials" />
        </SettingCard>

        <SettingCard title="Seguridad" icon={Shield}>
          <SettingLine label="Usuarios activos" value={`${data.stats.activeUsers}/${data.stats.totalUsers}`} href="/super-admin/usuarios" />
          <SettingLine label="Usuarios no activos" value={suspendedUsers} href="/super-admin/usuarios" />
          <SettingLine label="Super admins" value={superAdmins} href="/super-admin/roles" />
          <SettingLine label="Usuarios en software clasico" value={classicUsers} href="/super-admin/usuarios" />
        </SettingCard>

        <SettingCard title="Modulos y roles" icon={KeyRound}>
          <SettingLine label="Modulos disponibles" value={data.modules.length} href="/super-admin/modulos" />
          <SettingLine label="Modulos con uso" value={activeModuleCount} href="/super-admin/modulos" />
          <SettingLine label="Roles configurados" value={data.roles.length} href="/super-admin/roles" />
          <SettingLine
            label="Asignaciones de permisos"
            value={formatNumber(data.modules.reduce((sum, module) => sum + module.usersEnabled, 0))}
            href="/super-admin/modulos"
          />
        </SettingCard>

        <SettingCard title="Datos" icon={Users}>
          <SettingLine label="Pacientes" value={formatNumber(data.clinics.reduce((sum, clinic) => sum + clinic.resources.patients, 0))} href="/super-admin/recursos" />
          <SettingLine label="Citas" value={formatNumber(data.clinics.reduce((sum, clinic) => sum + clinic.resources.appointments, 0))} href="/super-admin/recursos" />
          <SettingLine label="Fichas clinicas" value={formatNumber(data.clinics.reduce((sum, clinic) => sum + clinic.resources.clinicalRecords, 0))} href="/super-admin/recursos" />
          <SettingLine label="Alertas internas" value={formatNumber(data.clinics.reduce((sum, clinic) => sum + clinic.resources.alerts, 0))} href="/super-admin/recursos" />
        </SettingCard>
      </div>
    </div>
  );
}
