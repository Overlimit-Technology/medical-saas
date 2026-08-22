"use client";

import { useRef } from "react";
import { useClinicDashboardViewModel } from "./ClinicDashboardViewModel";
import {
  formatCurrency,
  SkeletonCard,
  SkeletonBlock,
} from "./shared";
import {
  DoorOpen,
  Pill,
  ClipboardList,
  UserCog,
  Users,
  CalendarDays,
  Wallet,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DoorOpen,
  Pill,
  ClipboardList,
  UserCog,
  Users,
  CalendarDays,
  Wallet,
};

export default function ClinicDashboard() {
  const {
    state,
    clinicProfile,
    isAdmin,
    profileForm,
    profileEditing,
    profileSaving,
    profileError,
    profileSuccess,
    logoUploading,
    actions,
  } = useClinicDashboardViewModel();
  const { data, loading, error } = state;
  const { fetchData } = actions;
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ----- Loading skeleton ----- */
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock h="h-64" />
          <SkeletonBlock h="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500">
        <AlertCircle size={40} className="text-rose-400" />
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="text-sm text-[#19b3bc] underline hover:text-[#159ea7]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { clinic, modules, topTreatments, canManageUsers } = data;

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build module cards
  const modulesList = [
    {
      key: "formTemplates",
      href: "/form-templates",
      ...modules.formTemplates,
    },
    {
      key: "boxes",
      href: "/boxes",
      ...modules.boxes,
    },
    {
      key: "treatments",
      href: "/treatments",
      ...modules.treatments,
    },
    {
      key: "users",
      href: "/usuarios",
      ...modules.users,
    },
    {
      key: "vacations",
      href: "/vacaciones",
      label: "Vacaciones",
      total: "Panel",
      icon: "CalendarDays",
    },
    {
      key: "liquidaciones",
      href: "/liquidaciones",
      label: "Liquidaciones",
      total: "Panel",
      icon: "Wallet",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 capitalize">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Mi clínica
            {clinic.city && <span className="ml-2 text-base font-normal text-slate-400">· {clinic.city}</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Resumen de tus módulos y configuraciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {modulesList.map((module, i) => {
          const Icon = MODULE_ICONS[module.icon] || Users;
          const isUsers = module.key === "users";
          const isShortcut = module.key === "vacations" || module.key === "liquidaciones";

          return (
            <Link
              key={module.key}
              href={module.href}
              className={`group rounded-2xl border p-6 shadow-sm transition animate-fade-in hover:shadow-md ${
                isShortcut
                  ? "bg-gradient-to-br from-cyan-50 to-white border-cyan-100 hover:border-[#19b3bc]"
                  : "bg-white border-slate-100 hover:border-[#19b3bc]"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg transition ${
                      isShortcut
                        ? "bg-[#19b3bc]/10 group-hover:bg-[#19b3bc]"
                        : "bg-slate-50 group-hover:bg-[#19b3bc]"
                    }`}
                  >
                    <Icon className="h-6 w-6 text-[#19b3bc] group-hover:text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#19b3bc] transition" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{module.label}</p>
                </div>
                {isUsers ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-slate-900">{module.total}</p>
                    <p className="text-xs text-slate-500">{modules.users.doctors} doctores · {modules.users.staff} staff</p>
                  </div>
                ) : isShortcut ? (
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">Abrir</p>
                    <p className="text-xs text-slate-500">Configuración y gestión</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-slate-900">{module.total}</p>
                )}
              </div>
            </Link>
          );
        })}

        {/* Patients Card */}
        <Link
          href="/patients"
          className="group rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 shadow-sm hover:shadow-md transition animate-fade-in hover:border-emerald-300"
          style={{ animationDelay: `${modulesList.length * 60}ms` }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition">
                <Users className="h-6 w-6 text-emerald-600" strokeWidth={2} />
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 transition" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Pacientes</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{modules.patients.total}</p>
          </div>
        </Link>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {/* Module Overview Card */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Estado de módulos</p>
            <TrendingUp size={16} className="text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Fichas Clínicas</span>
              <span className="text-sm font-semibold text-slate-900">{modules.formTemplates.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Boxes</span>
              <span className="text-sm font-semibold text-slate-900">{modules.boxes.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Tratamientos</span>
              <span className="text-sm font-semibold text-slate-900">{modules.treatments.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Usuarios Activos</span>
              <span className="text-sm font-semibold text-slate-900">{modules.users.total}</span>
            </div>
          </div>
        </div>

        {/* Team Overview Card */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "420ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Tu equipo</p>
            <UserCog size={16} className="text-slate-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">Doctores</span>
                <span className="text-sm font-semibold text-blue-600">{modules.users.doctors}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-400 transition-all duration-500"
                  style={{
                    width: `${modules.users.total > 0 ? (modules.users.doctors / modules.users.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">Personal</span>
                <span className="text-sm font-semibold text-violet-600">{modules.users.staff}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-violet-400 transition-all duration-500"
                  style={{
                    width: `${modules.users.total > 0 ? (modules.users.staff / modules.users.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Treatments Card */}
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm animate-card-in" style={{ animationDelay: "480ms" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Tratamientos activos</p>
            <Pill size={16} className="text-slate-400" />
          </div>
          {topTreatments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin tratamientos configurados</p>
          ) : (
            <div className="space-y-2">
              {topTreatments.slice(0, 4).map((treatment) => (
                <div key={treatment.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate">{treatment.name}</span>
                  <span className="text-slate-900 font-medium whitespace-nowrap ml-2">{formatCurrency(treatment.price)}</span>
                </div>
              ))}
              {topTreatments.length > 4 && (
                <p className="text-xs text-slate-400 pt-2">+{topTreatments.length - 4} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-[#19b3bc]/5 to-emerald-50 border border-[#19b3bc]/20 p-6 animate-card-in" style={{ animationDelay: "540ms" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {canManageUsers
                ? "Gestiona usuarios entre todas las sedes"
                : "¿Necesitas agregar más elementos a tu clínica?"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {canManageUsers
                ? "Como super admin puedes activar usuarios, deshabilitarlos y decidir si entran al software nuevo o a Zensya."
                : "Accede a cualquier módulo desde el menú lateral"}
            </p>
          </div>
          <Link
            href={canManageUsers ? "/gestion-usuarios" : "/usuarios"}
            className="inline-flex items-center gap-2 rounded-lg bg-[#19b3bc] px-4 py-2 text-sm font-medium text-white hover:bg-[#159ea7] transition whitespace-nowrap"
          >
            Gestionar usuarios
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Clinic Profile */}
      {clinicProfile && (
        <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm animate-card-in" style={{ animationDelay: "600ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Perfil de la clínica</h2>
              <p className="mt-0.5 text-xs text-slate-400">Logo, nombre, dirección y teléfono</p>
            </div>
            {isAdmin && !profileEditing && (
              <button
                onClick={actions.startProfileEditing}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Editar
              </button>
            )}
            {isAdmin && profileEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={actions.cancelProfileEditing}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={actions.saveProfile}
                  disabled={profileSaving}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  {profileSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr]">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              {(profileEditing ? profileForm.logoUrl : clinicProfile.logoUrl) ? (
                <img
                  src={(profileEditing ? profileForm.logoUrl : clinicProfile.logoUrl) ?? ""}
                  alt="Logo clínica"
                  className="h-20 max-w-[160px] rounded-lg border border-slate-200 object-contain p-1"
                />
              ) : (
                <div className="flex h-20 w-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                  <span className="text-xs text-slate-400">Sin logo</span>
                </div>
              )}
              {profileEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void actions.handleLogoUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={logoUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#19b3bc] hover:underline disabled:opacity-50"
                  >
                    {logoUploading ? "Subiendo..." : clinicProfile.logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  {profileForm.logoUrl && (
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => void actions.handleLogoRemove()}
                      className="text-xs text-rose-400 hover:underline disabled:opacity-50"
                    >
                      Quitar logo
                    </button>
                  )}
                  <p className="text-center text-[10px] text-slate-400">PNG, JPG, WebP o SVG · máx. 2 MB</p>
                </>
              )}
            </div>

            {/* Fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              {(["name", "city", "address", "phone"] as const).map((key) => {
                const labels: Record<string, string> = {
                  name: "Nombre",
                  city: "Ciudad",
                  address: "Dirección",
                  phone: "Teléfono",
                };
                return (
                  <div key={key}>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {labels[key]}
                    </p>
                    {profileEditing ? (
                      <input
                        value={profileForm[key]}
                        onChange={(e) => actions.handleProfileFieldChange(key, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <p className="text-sm text-slate-700">
                        {clinicProfile[key] || <span className="italic text-slate-400">—</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {profileError && (
            <div className="mt-3 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
              {profileError}
            </div>
          )}
        </div>
      )}

      {/* Profile success toast */}
      {profileSuccess && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {profileSuccess}
        </div>
      )}
    </div>
  );
}
