"use client";

import React from "react";
import { C, Button, Card, ProgressBar, StatCard, PageHeader } from "./shared";
// ─── ZENSYA ADMIN — RECURSOS (NEON + VERCEL) ─────────────────────────────────

const NEON_DATA = [
  { clinic: 'Clínica Munay', project: 'zensya-munay', branch: 'main', storage: 720, maxStorage: 1000, connections: 18, maxConn: 50, compute: 42, region: 'us-east-2', status: 'healthy' },
  { clinic: 'Clínica Vitalia', project: 'zensya-vitalia', branch: 'main', storage: 180, maxStorage: 1000, connections: 4, maxConn: 50, compute: 8, region: 'us-east-2', status: 'healthy' },
  { clinic: 'Centro Médico Norte', project: 'zensya-norte', branch: 'main', storage: 410, maxStorage: 1000, connections: 9, maxConn: 50, compute: 24, region: 'us-east-2', status: 'healthy' },
  { clinic: 'Clínica Verde', project: 'zensya-verde', branch: 'main', storage: 580, maxStorage: 1000, connections: 12, maxConn: 50, compute: 33, region: 'us-east-2', status: 'warning' },
  { clinic: 'BioSalud', project: 'zensya-biosalud', branch: 'main', storage: 50, maxStorage: 1000, connections: 3, maxConn: 50, compute: 5, region: 'us-east-2', status: 'healthy' },
];

const VERCEL_DATA = [
  { clinic: 'Clínica Munay', deployment: 'zensya-munay.vercel.app', bandwidth: 8.2, maxBw: 20, builds: 14, invocations: 142000, status: 'active', lastDeploy: 'Hace 2 días' },
  { clinic: 'Clínica Vitalia', deployment: 'zensya-vitalia.vercel.app', bandwidth: 0.4, maxBw: 20, builds: 3, invocations: 8200, status: 'active', lastDeploy: 'Hace 5 días' },
  { clinic: 'Centro Médico Norte', deployment: 'zensya-norte.vercel.app', bandwidth: 3.1, maxBw: 20, builds: 7, invocations: 54000, status: 'active', lastDeploy: 'Hace 1 semana' },
  { clinic: 'Clínica Verde', deployment: 'zensya-verde.vercel.app', bandwidth: 5.8, maxBw: 20, builds: 11, invocations: 98000, status: 'active', lastDeploy: 'Hace 3 días' },
  { clinic: 'BioSalud', deployment: 'zensya-biosalud.vercel.app', bandwidth: 0.1, maxBw: 20, builds: 2, invocations: 2100, status: 'active', lastDeploy: 'Hoy' },
];

const SparkBar = ({ values, color, height = 32 }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1, background: color, borderRadius: '2px 2px 0 0',
          height: `${Math.max(4, (v / max) * 100)}%`,
          opacity: 0.3 + (i / values.length) * 0.7,
        }} />
      ))}
    </div>
  );
};

const MiniMetric = ({ label, value, unit, color = C.teal }) => (
  <div style={{ textAlign: 'center' }}>
    <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}<span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>{unit}</span></p>
    <p style={{ fontSize: 10, color: C.muted, margin: '3px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
  </div>
);

const ResourcesScreen = () => {
  const [tab, setTab] = React.useState('neon');

  const totalStorage = NEON_DATA.reduce((a, c) => a + c.storage, 0);
  const totalConnections = NEON_DATA.reduce((a, c) => a + c.connections, 0);
  const totalBw = VERCEL_DATA.reduce((a, c) => a + c.bandwidth, 0);
  const totalInv = VERCEL_DATA.reduce((a, c) => a + c.invocations, 0);

  return (
    <div className="section-enter">
      <PageHeader
        title="Recursos"
        sub="Monitoreo de infraestructura — Neon DB & Vercel"
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Storage Total (Neon)" value={`${(totalStorage/1000).toFixed(1)} GB`} sub="de 5 GB máximo" icon="database" color={C.teal} />
        <StatCard label="Conexiones activas" value={totalConnections} sub={`de ${NEON_DATA.length * 50} máximo`} icon="link" color={C.purple} colorLight={C.purpleLight} />
        <StatCard label="Bandwidth (Vercel)" value={`${totalBw.toFixed(1)} GB`} sub="de 100 GB máximo" icon="wifi" color={C.success} colorLight={C.successLight} />
        <StatCard label="Invocaciones/mes" value={`${(totalInv/1000).toFixed(0)}k`} sub="funciones serverless" icon="zap" color={C.warning} colorLight={C.warningLight} />
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 4, width: 'fit-content', marginBottom: 16 }}>
        {[['neon','Neon DB'],['vercel','Vercel']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: '6px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === v ? C.teal : 'transparent', color: tab === v ? '#fff' : C.muted, transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {tab === 'neon' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NEON_DATA.map((d, i) => (
            <Card key={i} padding="0">
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 0 }}>
                {/* Clinic info */}
                <div style={{ padding: '16px 20px', borderRight: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.status === 'healthy' ? C.success : C.warning, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{d.clinic}</p>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: 'monospace' }}>{d.project}</p>
                  <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>{d.region}</p>
                </div>

                {/* Metrics */}
                <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Storage</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.storage/d.maxStorage > 0.7 ? C.danger : C.text }}>{d.storage} MB</span>
                    </div>
                    <ProgressBar value={d.storage} max={d.maxStorage} height={6} showLabel={false} />
                    <span style={{ fontSize: 10, color: C.subtle }}>{Math.round(d.storage/d.maxStorage*100)}% de 1 GB</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Conexiones</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.connections}/{d.maxConn}</span>
                    </div>
                    <ProgressBar value={d.connections} max={d.maxConn} height={6} showLabel={false} color={C.purple} />
                    <span style={{ fontSize: 10, color: C.subtle }}>{Math.round(d.connections/d.maxConn*100)}% del límite</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Compute hrs</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.compute}h</span>
                    </div>
                    <SparkBar values={[12,18,15,22,d.compute,d.compute-3,d.compute]} color={C.teal} height={28} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 16px', borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', minWidth: 110 }}>
                  <Button variant="secondary" size="sm" icon="eye">Dashboard</Button>
                  <Button variant="ghost" size="sm" icon="database">Consola</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VERCEL_DATA.map((d, i) => (
            <Card key={i} padding="0">
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 0 }}>
                {/* Clinic info */}
                <div style={{ padding: '16px 20px', borderRight: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{d.clinic}</p>
                  </div>
                  <p style={{ fontSize: 10, color: C.muted, margin: 0, fontFamily: 'monospace' }}>{d.deployment}</p>
                  <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>Deploy: {d.lastDeploy}</p>
                </div>

                {/* Metrics */}
                <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Bandwidth</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{d.bandwidth} GB</span>
                    </div>
                    <ProgressBar value={d.bandwidth} max={d.maxBw} height={6} showLabel={false} color={C.success} />
                    <span style={{ fontSize: 10, color: C.subtle }}>{Math.round(d.bandwidth/d.maxBw*100)}% de 20 GB</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Invocaciones</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{(d.invocations/1000).toFixed(1)}k</span>
                    </div>
                    <SparkBar values={[d.invocations*0.4,d.invocations*0.6,d.invocations*0.8,d.invocations*0.9,d.invocations,d.invocations*0.85,d.invocations].map(x=>Math.round(x/1000))} color={C.success} height={28} />
                  </div>
                  <div>
                    <MiniMetric label="Builds" value={d.builds} unit=" este mes" color={C.tealMid} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 16px', borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', minWidth: 110 }}>
                  <Button variant="secondary" size="sm" icon="eye">Dashboard</Button>
                  <Button variant="ghost" size="sm" icon="zap">Redeploy</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};


export default ResourcesScreen;

