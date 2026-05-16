"use client";

import Image from "next/image";
import { useState, type ComponentType } from "react";
import Sidebar from "./superadmin/Sidebar";
import OverviewScreen from "./superadmin/Overview";
import ClinicsScreen from "./superadmin/Clinics";
import UsersScreen from "./superadmin/Users";
import RolesScreen from "./superadmin/Roles";
import ModulesScreen from "./superadmin/Modules";
import TrialsScreen from "./superadmin/Trials";
import ResourcesScreen from "./superadmin/Resources";
import { C, Icon, Badge } from "./superadmin/shared";

type ScreenId = "overview" | "clinics" | "users" | "roles" | "modules" | "trials" | "resources";

const OverviewScreenView = OverviewScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const ClinicsScreenView = ClinicsScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const UsersScreenView = UsersScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const RolesScreenView = RolesScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const ModulesScreenView = ModulesScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const TrialsScreenView = TrialsScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;
const ResourcesScreenView = ResourcesScreen as unknown as ComponentType<{ onNav: (screen: ScreenId) => void }>;

export default function AdminDashboard() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("overview");
  const [notifOpen, setNotifOpen] = useState(false);

  const renderScreen = () => {
    switch (activeScreen) {
      case "overview":
        return <OverviewScreenView onNav={setActiveScreen} />;
      case "clinics":
        return <ClinicsScreenView onNav={setActiveScreen} />;
      case "users":
        return <UsersScreenView onNav={setActiveScreen} />;
      case "roles":
        return <RolesScreenView onNav={setActiveScreen} />;
      case "modules":
        return <ModulesScreenView onNav={setActiveScreen} />;
      case "trials":
        return <TrialsScreenView onNav={setActiveScreen} />;
      case "resources":
        return <ResourcesScreenView onNav={setActiveScreen} />;
      default:
        return <OverviewScreenView onNav={setActiveScreen} />;
    }
  };

  return (
    <>
      <style jsx global>{`
        .section-enter {
          animation: fadeUp 0.22s ease;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: C.bg,
          fontFamily: "Inter, var(--font-geist-sans), sans-serif",
        }}
      >
        <Sidebar active={activeScreen} onNav={setActiveScreen} collapsed={false} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <header
            style={{
              height: 60,
              background: "#fff",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              flexShrink: 0,
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image src="/images/branding/Zensya.png" alt="Zensya" width={90} height={24} style={{ height: 24, width: "auto" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Resumen</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.subtle,
                  }}
                >
                  <Icon name="search" size={13} />
                </div>
                <input
                  placeholder="Buscar..."
                  style={{
                    padding: "7px 12px 7px 30px",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: C.text,
                    background: C.bgSoft,
                    outline: "none",
                    width: 200,
                  }}
                />
              </div>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setNotifOpen((prev) => !prev)}
                  style={{
                    background: "none",
                    border: `1.5px solid ${C.border}`,
                    cursor: "pointer",
                    color: C.muted,
                    padding: 6,
                    borderRadius: 8,
                    display: "flex",
                    position: "relative",
                  }}
                >
                  <Icon name="bell" size={16} />
                  <div
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: C.danger,
                      border: "1.5px solid #fff",
                    }}
                  />
                </button>

                {notifOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "110%",
                      background: "#fff",
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(11,22,40,0.12)",
                      width: 300,
                      zIndex: 200,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: `1px solid ${C.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Notificaciones</span>
                      <Badge variant="danger" size="xs">3 nuevas</Badge>
                    </div>

                    {[
                      { text: "Revisa el resumen de actividad", time: "hace 2 h", icon: "activity", color: C.teal },
                      { text: "Hay nuevos usuarios creados", time: "hace 6 h", icon: "user", color: C.success },
                      { text: "Nueva clinica registrada", time: "hace 1 d", icon: "building", color: C.warning },
                    ].map((item) => (
                      <div
                        key={item.text}
                        onClick={() => setNotifOpen(false)}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "12px 16px",
                          borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: `${item.color}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name={item.icon as never} size={13} color={item.color} />
                        </div>
                        <div>
                          <p style={{ fontSize: 12, color: C.text, margin: 0, fontWeight: 500 }}>{item.text}</p>
                          <p style={{ fontSize: 11, color: C.subtle, margin: "2px 0 0" }}>{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: C.teal,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                SA
              </div>
            </div>
          </header>

          <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>{renderScreen()}</main>
        </div>
      </div>
    </>
  );
}
