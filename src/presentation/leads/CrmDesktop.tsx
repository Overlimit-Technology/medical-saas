"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import Leads from "./Leads";

const CrmDashboard = dynamic(() => import("./tabs/CrmDashboard"), { ssr: false });
const CrmActivities = dynamic(() => import("./tabs/CrmActivities"), { ssr: false });
const CrmContacts = dynamic(() => import("./tabs/CrmContacts"), { ssr: false });
const CrmInbox = dynamic(() => import("./tabs/CrmInbox"), { ssr: false });

type CrmTab = "pipeline" | "inbox" | "dashboard" | "activities" | "contacts";

const TABS: { key: CrmTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "pipeline",
    label: "Pipeline",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="6" height="14" x="2" y="5" rx="1" /><rect width="6" height="10" x="9" y="9" rx="1" /><rect width="6" height="16" x="16" y="3" rx="1" />
      </svg>
    ),
  },
  {
    key: "inbox",
    label: "Inbox",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    key: "activities",
    label: "Actividades",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: "contacts",
    label: "Contactos",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function CrmDesktop() {
  const [activeTab, setActiveTab] = useState<CrmTab>("pipeline");
  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? "CRM";

  const activeContent = (() => {
    if (activeTab === "pipeline") return <Leads />;
    if (activeTab === "inbox") return <CrmInbox />;
    if (activeTab === "dashboard") return <CrmDashboard />;
    if (activeTab === "activities") return <CrmActivities />;
    return <CrmContacts />;
  })();

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-8 -my-8 bg-slate-100">
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-slate-50">
          <header className="shrink-0 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.11em] text-slate-400">CRM</p>
                <h1 className="text-xl font-semibold text-slate-900">{activeTabLabel}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500 sm:block">
                  Modulo CRM
                </div>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-1.5 font-medium text-white transition hover:bg-slate-700"
                >
                  Nuevo
                </button>
              </div>
            </div>

            <div className="mt-3 flex overflow-x-auto pb-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`mr-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-hidden rounded-b-3xl">
            {activeContent}
          </main>
        </div>
      </div>
    </div>
  );
}
