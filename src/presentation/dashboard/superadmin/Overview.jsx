"use client";

import React, { useEffect, useMemo, useState } from "react";
import { C, Icon, Badge, Card, StatCard, PageHeader } from "./shared";

function statusBadge(status) {
  if (status === "active") return <Badge variant="success">Activa</Badge>;
  return <Badge variant="default">Inactiva</Badge>;
}

function toTrend(value) {
  const parsed = Number.parseFloat(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const OverviewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/super-admin/overview", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "No se pudo cargar el resumen");
        }
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el resumen");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = data?.stats;
  const clinics = data?.clinics ?? [];
  const activity = data?.activity ?? [];

  const activePercent = useMemo(() => {
    if (!stats || stats.totalUsers === 0) return 0;
    return Math.round((stats.activeUsers / stats.totalUsers) * 100);
  }, [stats]);

  if (loading) {
    return (
      <div className="section-enter">
        <PageHeader title="Resumen" sub="Cargando datos desde base de datos" />
        <Card>
          <p style={{ fontSize: 14, color: C.muted }}>Cargando...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-enter">
        <PageHeader title="Resumen" sub="Datos del super admin" />
        <Card>
          <p style={{ fontSize: 14, color: C.danger }}>{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="section-enter">
      <PageHeader title="Resumen" sub="Datos reales desde base de datos" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Clinicas activas"
          value={String(stats?.activeClinics ?? 0)}
          sub={`${stats?.totalClinics ?? 0} clinicas en total`}
          trend={toTrend(stats?.newClinicsDelta)}
          icon="building"
          color={C.teal}
          colorLight={C.tealLight}
        />
        <StatCard
          label="Usuarios totales"
          value={String(stats?.totalUsers ?? 0)}
          sub={`${stats?.activeUsers ?? 0} activos (${activePercent}%)`}
          trend={toTrend(stats?.newUsersDelta)}
          icon="users"
          color={C.success}
          colorLight={C.successLight}
        />
        <StatCard
          label="Usuarios activos"
          value={String(stats?.activeUsers ?? 0)}
          sub="Estado activo en sedes"
          icon="check"
          color={C.warning}
          colorLight={C.warningLight}
        />
        <StatCard
          label="Usuarios nuevos mes"
          value={String(stats?.newUsersMonth ?? 0)}
          sub="Nuevos registros del mes"
          icon="activity"
          color={C.purple}
          colorLight={C.purpleLight}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Clinicas</h3>
            <span style={{ fontSize: 12, color: C.muted }}>{clinics.length} registros</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Clinica", "Ciudad", "Estado", "Usuarios", "Activos"].map((header) => (
                  <th
                    key={header}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.muted,
                      textAlign: "left",
                      padding: "0 0 10px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr key={clinic.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 0", fontSize: 13, fontWeight: 600, color: C.text }}>{clinic.name}</td>
                  <td style={{ padding: "12px 0", fontSize: 13, color: C.muted }}>{clinic.city}</td>
                  <td style={{ padding: "12px 0" }}>{statusBadge(clinic.status)}</td>
                  <td style={{ padding: "12px 0", fontSize: 13, color: C.muted }}>{clinic.totalUsers}</td>
                  <td style={{ padding: "12px 0", fontSize: 13, color: C.muted }}>{clinic.activeUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Actividad reciente</h3>
            <Icon name="activity" size={15} color={C.muted} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {activity.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: index < activity.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: item.tone === "success" ? `${C.success}18` : `${C.teal}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon name={item.tone === "success" ? "user" : "building"} size={13} color={item.tone === "success" ? C.success : C.teal} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: C.text, margin: 0, fontWeight: 500, lineHeight: 1.4 }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: C.subtle, margin: "2px 0 0" }}>{item.timeLabel}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 ? (
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Sin actividad reciente</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OverviewScreen;
