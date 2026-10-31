"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCircle,
  Building2,
  Mail,
  KanbanSquare,
  ChevronLeft,
  CalendarDays,
  FileText,
  Coins,
  ShieldCheck,
  DoorOpen,
  Pill,
  UserCog,
  Wallet,
  HeartPulse,
  Receipt,
  Bell,
} from "lucide-react";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";
import CrmTab from "./tabs/CrmTab";
import BookingTab from "./tabs/BookingTab";
import EmailTab from "./tabs/EmailTab";
import SharedSessionsTab from "./tabs/SharedSessionsTab";
import OptionFinder, { type Option } from "@/presentation/ui/OptionFinder";
import { Loading, PageHead, Segmented, View } from "@/presentation/ui/zs";

type AdminView = "landing" | "comunicaciones" | "seguridad";
type ComunicacionesTab = "contactabilidad" | "crm" | "reserva";

export default function Settings() {
  const getMyProfileUseCase = useMemo(() => new GetMyProfileUseCase(new ProfileRepositoryHttp()), []);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfileUseCase
      .execute()
      .then((profile) => setRole(profile.role))
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, [getMyProfileUseCase]);

  if (loading) return <Loading />;
  if (role === "ADMIN") return <AdminSettings />;
  return <StaffSettings role={role} />;
}

// Lo personal vive en Mi perfil; aca se busca y se entra a cada ajuste.
const PERSONAL: Option[] = [
  { id: "me", group: "Mi cuenta", title: "Mis datos y foto", description: "Nombre, correo, teléfono y contraseña.", href: "/profile", icon: UserCircle, keywords: "perfil nombre foto contraseña clave correo" },
  { id: "my-vacations", group: "Mi cuenta", title: "Mis vacaciones", description: "Pide días y revisa cuántos te quedan.", href: "/profile?tab=vacaciones", icon: CalendarDays, keywords: "vacaciones dias libres ausencia permiso" },
];

// =============================================================================
// ADMIN
// =============================================================================

function AdminSettings() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("vista");
  const view: AdminView = requested === "comunicaciones" || requested === "seguridad" ? requested : "landing";
  const [comTab, setComTab] = useState<ComunicacionesTab>(
    (["contactabilidad", "crm", "reserva"] as const).find((t) => t === params.get("tab")) ?? "contactabilidad"
  );

  const back = () => router.push("/configuracion");

  if (view === "seguridad") {
    return (
      <View label="Seguridad de acceso">
        <PageHead back={<BackButton onClick={back} />} tag="Configuración" title="Seguridad" accent="de acceso" lead="Varias personas en un mismo computador, con bloqueo automático." />
        <SharedSessionsTab />
      </View>
    );
  }

  if (view === "comunicaciones") {
    return (
      <View label="Correos, CRM y reserva online">
        <PageHead back={<BackButton onClick={back} />} tag="Configuración" title="Correos, CRM" accent="y reserva online" lead="Qué se envía solo, cuándo y a quién." />
        <Segmented
          label="Secciones"
          value={comTab}
          onChange={setComTab}
          items={[
            { id: "contactabilidad", label: "Avisos automáticos", icon: Mail },
            { id: "crm", label: "CRM", icon: KanbanSquare },
            { id: "reserva", label: "Reserva online", icon: CalendarDays },
          ]}
        />
        {comTab === "contactabilidad" && <EmailTab />}
        {comTab === "crm" && <CrmTab />}
        {comTab === "reserva" && <BookingTab />}
      </View>
    );
  }

  const options: Option[] = [
    ...PERSONAL,
    { id: "clinic", group: "Clínica", title: "Perfil de la clínica", description: "Logo, nombre, dirección y teléfono.", href: "/clinic-dashboard/clinica", icon: Building2, keywords: "logo nombre direccion telefono sede" },
    { id: "boxes", group: "Clínica", title: "Boxes y salas", description: "Dónde se atiende.", href: "/boxes", icon: DoorOpen, keywords: "sala box consulta recursos mapa" },
    { id: "treatments", group: "Clínica", title: "Tratamientos y servicios", description: "Catálogo con precios y códigos.", href: "/treatments", icon: Pill, keywords: "servicios precios fonasa prestaciones" },
    { id: "forms", group: "Clínica", title: "Fichas clínicas", description: "Plantillas por especialidad.", href: "/form-templates", icon: FileText, keywords: "plantillas formulario anamnesis" },
    { id: "users", group: "Equipo", title: "Usuarios y permisos", description: "Profesionales, secretarias y roles.", href: "/usuarios", icon: UserCog, keywords: "doctores equipo roles permisos" },
    { id: "team-vacations", group: "Equipo", title: "Vacaciones del equipo", description: "Límites y solicitudes por aprobar.", href: "/vacaciones", icon: CalendarDays, keywords: "ausencias aprobar dias" },
    { id: "payouts", group: "Equipo", title: "Liquidaciones", description: "Pago mensual a cada profesional.", href: "/liquidaciones", icon: Wallet, keywords: "honorarios boletas sii pagos" },
    { id: "emails", group: "Comunicación", title: "Avisos automáticos", description: "Confirmaciones, recordatorios y bienvenidas.", href: "/configuracion?vista=comunicaciones", icon: Mail, keywords: "correo email recordatorio confirmacion whatsapp plantilla" },
    { id: "crm", group: "Comunicación", title: "CRM", description: "Canales, etapas y asistente.", href: "/configuracion?vista=comunicaciones&tab=crm", icon: KanbanSquare, keywords: "leads whatsapp instagram messenger agente ia" },
    { id: "booking", group: "Comunicación", title: "Reserva online", description: "Enlace público para reservar horas.", href: "/configuracion?vista=comunicaciones&tab=reserva", icon: CalendarDays, keywords: "link reserva agendamiento online" },
    { id: "portal", group: "Comunicación", title: "Portal del paciente", description: "Enlace de tus pacientes.", href: "/portal-paciente", icon: HeartPulse, keywords: "portal pacientes enlace" },
    { id: "security", group: "Seguridad", title: "Seguridad de acceso", description: "Equipos compartidos y bloqueo automático.", href: "/configuracion?vista=seguridad", icon: ShieldCheck, keywords: "sesiones pin bloqueo compartido contraseña" },
  ];

  return (
    <View label="Configuración">
      <PageHead tag="Configuración" title="¿Qué quieres" accent="ajustar hoy?" lead="Escribe lo que buscas o entra por sección." />
      <OptionFinder options={options} placeholder="Buscar: correo, boxes, permisos, vacaciones…" />
    </View>
  );
}

// =============================================================================
// PROFESIONAL Y SECRETARIA
// =============================================================================

function StaffSettings({ role }: { role: string | null }) {
  const options: Option[] = [
    ...PERSONAL,
    ...(role === "DOCTOR"
      ? [{ id: "boleta", group: "Mi cuenta", title: "Mi boleta de honorarios", description: "Datos para emitir tu boleta del mes.", href: "/profile?tab=boleta", icon: Receipt, keywords: "boleta sii honorarios" }]
      : []),
    { id: "my-payouts", group: "Mi cuenta", title: "Mis liquidaciones", description: "Lo que te corresponde cada mes.", href: "/profile?tab=liquidaciones", icon: Coins, keywords: "pagos sueldo liquidacion" },
    { id: "forms", group: "Trabajo clínico", title: "Fichas clínicas", description: "Plantillas que usas en tus consultas.", href: "/form-templates", icon: FileText, keywords: "plantillas formulario anamnesis" },
    { id: "notifications", group: "Trabajo clínico", title: "Notificaciones", description: "Avisos de citas, llegadas y mensajes.", href: "/notifications", icon: Bell, keywords: "avisos alertas" },
  ];

  return (
    <View label="Configuración">
      <PageHead tag="Configuración" title="Tus" accent="ajustes" lead="Lo personal está en Mi perfil; aquí lo encuentras rápido." />
      <OptionFinder options={options} />
    </View>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Volver a Configuración"
      className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#50c9d5]"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
    </button>
  );
}

