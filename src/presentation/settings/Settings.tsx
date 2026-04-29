"use client";

import { useState } from "react";
import { UserCircle, Building2, KanbanSquare } from "lucide-react";
import ProfileTab from "./tabs/ProfileTab";
import ClinicTab from "./tabs/ClinicTab";
import CrmTab from "./tabs/CrmTab";

type SettingsTab = "perfil" | "clinica" | "crm";

const TABS: { id: SettingsTab; label: string; icon: typeof UserCircle }[] = [
  { id: "perfil", label: "Perfil", icon: UserCircle },
  { id: "clinica", label: "Clinica", icon: Building2 },
  { id: "crm", label: "CRM", icon: KanbanSquare },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Ajustes generales</p>
        <h1 className="text-2xl font-semibold text-slate-900">Configuracion</h1>
      </div>

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-white text-[#19b3bc] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "perfil" && <ProfileTab />}
      {activeTab === "clinica" && <ClinicTab />}
      {activeTab === "crm" && <CrmTab />}
    </div>
  );
}
