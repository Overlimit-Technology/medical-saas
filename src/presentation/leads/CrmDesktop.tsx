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

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-8 -my-8 flex-col bg-slate-50">
      {/* Top navigation bar */}
      <div className="shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-6">
          {/* Left: CRM title + tabs */}
          <div className="flex items-center gap-6">
            <h1 className="text-base font-semibold text-slate-800 py-3">CRM</h1>

            <nav className="flex items-center -mb-px">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      group relative flex items-center gap-2 px-4 py-3.5
                      text-sm font-medium transition-colors duration-150
                      ${isActive
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-600"
                      }
                    `}
                  >
                    <span className={`transition-colors duration-150 ${isActive ? "text-slate-700" : "text-slate-400 group-hover:text-slate-500"}`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-slate-800" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "pipeline" && <Leads />}
        {activeTab === "inbox" && <CrmInbox />}
        {activeTab === "dashboard" && <CrmDashboard />}
        {activeTab === "activities" && <CrmActivities />}
        {activeTab === "contacts" && <CrmContacts />}
      </div>
    </div>
  );
}
