"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UserCircle,
  Building2,
  Mail,
  KanbanSquare,
  ChevronLeft,
  CalendarDays,
  FileText,
  Coins,
} from "lucide-react";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";
import ProfileTab from "./tabs/ProfileTab";
import CrmTab from "./tabs/CrmTab";
import EmailTab from "./tabs/EmailTab";
import dynamic from "next/dynamic";

const VacationSettings = dynamic(
  () => import("@/presentation/vacations/VacationSettings"),
  { ssr: false },
);
const MyLiquidacionesTab = dynamic(
  () => import("./tabs/MyLiquidacionesTab"),
  { ssr: false },
);

type AdminView = "landing" | "perfil" | "comunicaciones";
type ComunicacionesTab = "contactabilidad" | "crm";
type DoctorTab = "perfil" | "vacaciones" | "fichas" | "liquidaciones";

export default function Settings() {
  const getMyProfileUseCase = useMemo(() => {
    return new GetMyProfileUseCase(new ProfileRepositoryHttp());
  }, []);

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await getMyProfileUseCase.execute();
        setRole(profile.role);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [getMyProfileUseCase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]" />
      </div>
    );
  }

  if (role === "ADMIN") {
    return <AdminSettings />;
  }

  return <StaffSettings />;
}

// =============================================================================
// ADMIN VIEW — 3 module cards landing + sub-views
// =============================================================================

function AdminSettings() {
  const [view, setView] = useState<AdminView>("landing");
  const [comTab, setComTab] = useState<ComunicacionesTab>("contactabilidad");

  if (view === "perfil") {
    return (
      <div className="space-y-6">
        <SubViewHeader title="Mi Perfil" onBack={() => setView("landing")} />
        <ProfileTab />
      </div>
    );
  }

  if (view === "comunicaciones") {
    return (
      <div className="space-y-6">
        <SubViewHeader title="Contactabilidad & CRM" onBack={() => setView("landing")} />

        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <TabButton
            active={comTab === "contactabilidad"}
            onClick={() => setComTab("contactabilidad")}
            icon={Mail}
            label="Contactabilidad"
          />
          <TabButton
            active={comTab === "crm"}
            onClick={() => setComTab("crm")}
            icon={KanbanSquare}
            label="CRM"
          />
        </div>

        {comTab === "contactabilidad" && <EmailTab />}
        {comTab === "crm" && <CrmTab />}
      </div>
    );
  }

  // Landing
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Ajustes generales</p>
        <h1 className="text-2xl font-semibold text-slate-900">Configuracion</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ModuleCard
          icon={UserCircle}
          title="Mi Perfil"
          description="Datos personales, foto y vacaciones"
          color="bg-[#19b3bc]"
          onClick={() => setView("perfil")}
        />
        <ModuleCard
          icon={Building2}
          title="Clinica"
          description="Datos institucionales, boxes y equipo"
          color="bg-indigo-500"
          onClick={() => window.location.assign("/clinic-dashboard")}
        />
        <ModuleCard
          icon={Mail}
          title="Contactabilidad & CRM"
          description="Emails, WhatsApp, redes y agentes IA"
          color="bg-violet-500"
          onClick={() => setView("comunicaciones")}
        />
      </div>
    </div>
  );
}

// =============================================================================
// DOCTOR / SECRETARY VIEW — "Mi Cuenta" with tabs
// =============================================================================

const DOCTOR_TABS: { id: DoctorTab; label: string; icon: typeof UserCircle }[] = [
  { id: "perfil", label: "Perfil", icon: UserCircle },
  { id: "vacaciones", label: "Vacaciones", icon: CalendarDays },
  { id: "fichas", label: "Fichas clinicas", icon: FileText },
  { id: "liquidaciones", label: "Liquidaciones", icon: Coins },
];

function StaffSettings() {
  const [tab, setTab] = useState<DoctorTab>("perfil");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Configuracion personal</p>
        <h1 className="text-2xl font-semibold text-slate-900">Mi Cuenta</h1>
      </div>

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {DOCTOR_TABS.map((t) => (
          <TabButton
            key={t.id}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            icon={t.icon}
            label={t.label}
          />
        ))}
      </div>

      {tab === "perfil" && <ProfileTab />}
      {tab === "vacaciones" && <VacationSettings />}
      {tab === "fichas" && <FichasClinicasTab />}
      {tab === "liquidaciones" && <MyLiquidacionesTab />}
    </div>
  );
}

// =============================================================================
// Fichas Clinicas — redirect to form-templates
// =============================================================================

function FichasClinicasTab() {
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Fichas clinicas</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Gestiona las plantillas de fichas clinicas disponibles para tus consultas
            </p>
          </div>
          <a
            href="/form-templates"
            className="rounded-2xl bg-[#19b3bc] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#159ea7]"
          >
            Ir a fichas
          </a>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Shared components
// =============================================================================

function ModuleCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: typeof UserCircle;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-4 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${color} text-white shadow-lg transition-transform group-hover:scale-105`}
      >
        <Icon className="h-8 w-8" strokeWidth={1.8} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </button>
  );
}

function SubViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div>
        <p className="text-sm text-slate-500">Configuracion</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserCircle;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-white text-[#19b3bc] shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}
