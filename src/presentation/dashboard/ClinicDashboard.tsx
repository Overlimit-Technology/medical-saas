"use client";

import { useRef } from "react";
import { useClinicDashboardViewModel } from "./ClinicDashboardViewModel";
import { formatCurrency, SkeletonBlock } from "./shared";
import {
  DoorOpen,
  Pill,
  ClipboardList,
  UserCog,
  Users,
  CalendarDays,
  Wallet,
  RefreshCw,
  HeartPulse,
  Mail,
  ShieldCheck,
  Building2,
} from "lucide-react";
import OptionFinder, { type Option } from "@/presentation/ui/OptionFinder";
import { Card, Notice, PageHead, View, btnClass, zs } from "@/presentation/ui/zs";

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

  if (loading && !data) {
    return (
      <View label="Mi clínica">
        <SkeletonBlock h="h-28" />
        <SkeletonBlock h="h-64" />
      </View>
    );
  }

  if (error) {
    return (
      <View label="Mi clínica">
        <Notice tone="err">
          {error}{" "}
          <button onClick={fetchData} className="font-semibold underline underline-offset-2">
            Reintentar
          </button>
        </Notice>
      </View>
    );
  }

  if (!data) return null;

  const { clinic, modules, topTreatments, canManageUsers } = data;
  const n = (count: number | string, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  // Todo lo que se configura de la sede, agrupado y con palabras para el buscador.
  const options: Option[] = [
    { id: "boxes", group: "Atención", title: "Boxes y salas", description: "Dónde se atiende: boxes, salas y equipos.", href: "/boxes", icon: DoorOpen, keywords: "sala consulta box recursos mapa", meta: n(modules.boxes.total, "box", "boxes") },
    { id: "treatments", group: "Atención", title: "Tratamientos y servicios", description: "Catálogo con precios y códigos.", href: "/treatments", icon: Pill, keywords: "servicios precios fonasa prestaciones catalogo", meta: n(modules.treatments.total, "servicio", "servicios") },
    { id: "forms", group: "Atención", title: "Fichas clínicas", description: "Plantillas de ficha para cada especialidad.", href: "/form-templates", icon: ClipboardList, keywords: "plantillas formulario anamnesis", meta: n(modules.formTemplates.total, "plantilla", "plantillas") },
    { id: "users", group: "Equipo", title: "Usuarios y permisos", description: `${modules.users.doctors} profesionales y ${modules.users.staff} de personal.`, href: canManageUsers ? "/gestion-usuarios" : "/usuarios", icon: UserCog, keywords: "doctores profesionales secretaria roles permisos equipo", meta: n(modules.users.total, "persona", "personas") },
    { id: "vacations", group: "Equipo", title: "Vacaciones del equipo", description: "Días permitidos y solicitudes por aprobar.", href: "/vacaciones", icon: CalendarDays, keywords: "ausencias feriados permisos dias" },
    { id: "payouts", group: "Equipo", title: "Liquidaciones", description: "Pago mensual a cada profesional.", href: "/liquidaciones", icon: Wallet, keywords: "honorarios boletas sueldo pagos sii" },
    { id: "patients", group: "Pacientes", title: "Pacientes", description: "Fichas e historial de la sede.", href: "/patients", icon: Users, keywords: "ficha historial clientes", meta: n(modules.patients.total, "paciente", "pacientes") },
    { id: "portal", group: "Pacientes", title: "Portal del paciente", description: "Enlace para que tus pacientes reserven y vean sus citas.", href: "/portal-paciente", icon: HeartPulse, keywords: "portal enlace link reservas pacientes" },
    { id: "comms", group: "Comunicación y seguridad", title: "Correos, CRM y reserva online", description: "Avisos automáticos, CRM y enlace de reserva.", href: "/configuracion?vista=comunicaciones", icon: Mail, keywords: "email correo whatsapp recordatorio confirmacion reserva crm plantillas" },
    { id: "security", group: "Comunicación y seguridad", title: "Seguridad de acceso", description: "Equipos compartidos y bloqueo automático.", href: "/configuracion?vista=seguridad", icon: ShieldCheck, keywords: "sesiones contraseña pin bloqueo compartido" },
  ];

  return (
    <View label="Mi clínica">
      <PageHead
        tag={
          <>
            <Building2 className="h-[15px] w-[15px]" strokeWidth={1.8} />
            Mi clínica
          </>
        }
        title="Configura"
        accent={clinic.name || "tu clínica"}
        lead={clinic.city ? `Sede ${clinic.city}. Busca lo que quieras ajustar o entra por sección.` : "Busca lo que quieras ajustar o entra por sección."}
        actions={
          <button type="button" onClick={fetchData} disabled={loading} className={btnClass("quiet", "sm")}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
            Actualizar
          </button>
        }
      />

      <OptionFinder options={options} placeholder="Buscar: boxes, servicios, vacaciones, correos…" />

      {topTreatments.length ? (
        <Card title="Servicios más usados" action={<a className={zs.link} href="/treatments">Ver catálogo →</a>}>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {topTreatments.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 border-t border-slate-200 py-2.5 text-sm first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                <span className="truncate text-slate-600">{t.name}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-slate-900">{formatCurrency(t.price)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Clinic Profile */}
      {clinicProfile && (
        <div className={zs.card}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-bold tracking-[-0.3px] text-slate-900">Perfil de la clínica</h2>
              <p className="mt-0.5 text-[13px] text-slate-500">Logo, nombre, dirección y teléfono que ven tus pacientes</p>
            </div>
            {isAdmin && !profileEditing && (
              <button
                onClick={actions.startProfileEditing}
                className={btnClass("quiet", "sm")}
              >
                Editar
              </button>
            )}
            {isAdmin && profileEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={actions.cancelProfileEditing}
                  className={btnClass("quiet", "sm")}
                >
                  Cancelar
                </button>
                <button
                  onClick={actions.saveProfile}
                  disabled={profileSaving}
                  className={btnClass("primary", "sm")}
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
                    className="text-xs text-[#1e737b] hover:underline disabled:opacity-50"
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
                    <p className={`${zs.label} mb-1.5`}>
                      {labels[key]}
                    </p>
                    {profileEditing ? (
                      <input
                        value={profileForm[key]}
                        onChange={(e) => actions.handleProfileFieldChange(key, e.target.value)}
                        className={zs.input}
                      />
                    ) : (
                      <p className="text-[15px] text-slate-900">
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
        <div className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {profileSuccess}
        </div>
      )}
    </View>
  );
}
