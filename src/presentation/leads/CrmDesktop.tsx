"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, KanbanSquare, MessageSquareText, Users2 } from "lucide-react";

import Leads from "./Leads";

const CrmDashboard = dynamic(() => import("./tabs/CrmDashboard"), { ssr: false });
const CrmActivities = dynamic(() => import("./tabs/CrmActivities"), { ssr: false });
const CrmContacts = dynamic(() => import("./tabs/CrmContacts"), { ssr: false });
const CrmInbox = dynamic(() => import("./tabs/CrmInbox"), { ssr: false });

type CrmTab = "pipeline" | "inbox" | "dashboard" | "activities" | "contacts";

type TabMeta = {
  key: CrmTab;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const TABS: TabMeta[] = [
  { key: "pipeline", label: "Pipeline", title: "Pipeline", description: "Oportunidades y seguimiento comercial.", icon: KanbanSquare },
  { key: "inbox", label: "Inbox", title: "Inbox", description: "Conversaciones y respuesta por canal.", icon: MessageSquareText },
  { key: "dashboard", label: "Dashboard", title: "Dashboard", description: "Resumen y rendimiento del CRM.", icon: BarChart3 },
  { key: "activities", label: "Actividades", title: "Actividades", description: "Timeline y cambios recientes.", icon: Activity },
  { key: "contacts", label: "Contactos", title: "Contactos", description: "Base comercial filtrable.", icon: Users2 },
];

export default function CrmDesktop() {
  const [activeTab, setActiveTab] = useState<CrmTab>("pipeline");
  const activeTabMeta = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-8 -my-8 bg-slate-50">
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="flex h-full min-h-0 flex-col gap-2.5">
          <section className="rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)]">
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#e8f8f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0f8f98]">
                    CRM
                  </span>
                  <span className="hidden text-[11px] text-slate-400 sm:inline">/</span>
                  <p className="text-[11px] text-slate-500">{activeTabMeta.description}</p>
                </div>
                <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {activeTabMeta.title}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "border-[#19b3bc] bg-[#19b3bc] text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#19b3bc]/35 hover:bg-white hover:text-[#0f8f98]"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_36px_-34px_rgba(15,23,42,0.3)]">
            <div className="h-full min-h-0 overflow-hidden">{getActiveContent(activeTab)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getActiveContent(activeTab: CrmTab) {
  if (activeTab === "pipeline") return <Leads />;
  if (activeTab === "inbox") return <CrmInbox />;
  if (activeTab === "dashboard") return <CrmDashboard />;
  if (activeTab === "activities") return <CrmActivities />;
  return <CrmContacts />;
}
