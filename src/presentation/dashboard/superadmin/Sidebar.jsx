"use client";

import React from "react";
import { C, Icon, Badge } from "./shared";

const NAV_ITEMS = [
  { id: "overview", label: "Resumen", icon: "dashboard" },
  { id: "clinics", label: "Clinicas", icon: "building" },
  { id: "users", label: "Usuarios", icon: "users" },
  { id: "roles", label: "Roles y permisos", icon: "shield" },
  { id: "modules", label: "Acceso a modulos", icon: "grid" },
  { id: "trials", label: "Trials", icon: "clock" },
  { id: "resources", label: "Recursos", icon: "server" },
];

const Sidebar = ({ active, onNav, collapsed }) => {
  const width = collapsed ? 64 : 232;

  return (
    <aside
      style={{
        width,
        minHeight: "100vh",
        background: C.sidebar,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 64,
          flexShrink: 0,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <img
          src="/images/branding/Zensya.png"
          alt="Zensya"
          style={{
            height: 28,
            filter: "brightness(0) invert(1)",
            objectFit: "contain",
            transition: "all 0.2s",
            width: collapsed ? 28 : "auto",
            maxWidth: collapsed ? 28 : 110,
          }}
        />
        {!collapsed ? <Badge variant="teal" size="xs">Admin</Badge> : null}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px" }} />

      {!collapsed ? (
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.3)",
            padding: "16px 20px 8px",
            textTransform: "uppercase",
          }}
        >
          Plataforma
        </p>
      ) : null}

      <nav style={{ flex: 1, padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={active === item.id}
            onNav={onNav}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <form action="/api/auth/logout" method="post">
          <LogoutItem collapsed={collapsed} />
        </form>
        <div style={{ height: 8 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "8px 0" : "8px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: C.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            SA
          </div>
          {!collapsed ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Super Admin
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: 0 }}>admin@zensya.cl</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

const LogoutItem = ({ collapsed }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="submit"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? "Cerrar sesion" : ""}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 8,
        cursor: "pointer",
        background: hover ? C.sidebarHover : "transparent",
        border: "none",
        transition: "all 0.15s",
      }}
    >
      <div style={{ color: hover ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", flexShrink: 0 }}>
        <Icon name="logout" size={17} />
      </div>
      {!collapsed ? (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: hover ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
            whiteSpace: "nowrap",
            transition: "color 0.15s",
          }}
        >
          Cerrar sesion
        </span>
      ) : null}
    </button>
  );
};

const NavItem = ({ item, isActive, onNav, collapsed }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={() => onNav(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : ""}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 8,
        cursor: "pointer",
        background: isActive ? C.sidebarActive : hover ? C.sidebarHover : "transparent",
        borderLeft: isActive ? `3px solid ${C.teal}` : "3px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ color: isActive ? C.tealBright : hover ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", flexShrink: 0 }}>
        <Icon name={item.icon} size={17} />
      </div>
      {!collapsed ? (
        <span
          style={{
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? "#fff" : hover ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
            whiteSpace: "nowrap",
            transition: "color 0.15s",
          }}
        >
          {item.label}
        </span>
      ) : null}
    </div>
  );
};

export { NAV_ITEMS };
export default Sidebar;
