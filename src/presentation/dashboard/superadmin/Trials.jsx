"use client";

import React from "react";
import { C, Icon, Badge, Button, Input, Select, Modal, Card, StatCard, PageHeader } from "./shared";
// ─── ZENSYA ADMIN — TRIALS ───────────────────────────────────────────────────

const TRIAL_DATA = [
  { id: 1, clinic: 'Clínica Vitalia', plan: 'Trial', start: '2025-04-18', end: '2025-05-18', days: 30, used: 5, status: 'active', contact: 'Dr. Patricia Soto', email: 'psoto@vitalia.cl' },
  { id: 2, clinic: 'BioSalud', plan: 'Trial', start: '2025-04-20', end: '2025-05-20', days: 30, used: 3, status: 'active', contact: 'Laura Muñoz', email: 'lmunoz@biosalud.cl' },
  { id: 3, clinic: 'Centro Médico Norte', plan: 'Starter', start: '2025-01-03', end: '2025-02-03', days: 30, used: 30, status: 'converted', contact: 'Jorge Fuentes', email: 'jfuentes@norte.cl' },
  { id: 4, clinic: 'Clínica Verde', plan: 'Pro', start: '2025-01-10', end: '2025-01-24', days: 14, used: 14, status: 'converted', contact: 'Camila Rojas', email: 'crojas@verde.cl' },
  { id: 5, clinic: 'Antigua Demo', plan: '—', start: '2025-02-01', end: '2025-03-03', days: 30, used: 30, status: 'expired', contact: '—', email: '—' },
];

const TrialStatusBadge = ({ s }) => {
  if (s === 'active') return <Badge variant="success">Activo</Badge>;
  if (s === 'converted') return <Badge variant="teal">Convertido</Badge>;
  if (s === 'expired') return <Badge variant="danger">Vencido</Badge>;
  return null;
};

const TrialBar = ({ used, total }) => {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const remaining = total - used;
  const color = remaining <= 5 ? C.danger : remaining <= 10 ? C.warning : C.teal;
  return (
    <div style={{ minWidth: 140 }}>
      <div style={{ background: C.bg, borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: C.muted }}>Día {used} de {total}</span>
        {remaining > 0 && <span style={{ fontSize: 10, fontWeight: 600, color }}>{remaining}d restantes</span>}
      </div>
    </div>
  );
};

const ExtendModal = ({ open, onClose, trial }) => {
  const [days, setDays] = React.useState('14');
  const [reason, setReason] = React.useState('');
  if (!trial) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Extender trial — ${trial.clinic}`} width={440}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" icon="calendar">Extender</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.bgSoft, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Vencimiento actual</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{trial.end}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: C.muted }}>Días restantes</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.warning }}>{trial.days - trial.used}d</span>
          </div>
        </div>
        <Select label="Días adicionales" value={days} onChange={setDays}
          options={[{value:'7',label:'7 días'},{value:'14',label:'14 días'},{value:'30',label:'30 días'},{value:'60',label:'60 días'}]} />
        <Input label="Motivo (opcional)" value={reason} onChange={setReason} placeholder="Ej: Solicitud del cliente, demo extendida..." />
        <div style={{ background: C.successLight, border: `1px solid #A7F3D0`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
          <Icon name="info" size={14} color={C.success} />
          <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>Se notificará automáticamente a <strong>{trial.email}</strong> con la nueva fecha.</p>
        </div>
      </div>
    </Modal>
  );
};

const ConvertModal = ({ open, onClose, trial }) => {
  const [plan, setPlan] = React.useState('starter');
  if (!trial) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Convertir trial — ${trial?.clinic}`} width={440}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" icon="zap">Convertir a plan</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: C.muted }}>Selecciona el plan al que deseas mover esta clínica.</p>
        {[['starter','Starter','Funciones esenciales · Hasta 3 usuarios','$29 USD/mes'],['pro','Pro','Todo Starter + reportes avanzados · Usuarios ilimitados','$79 USD/mes']].map(([v,n,d,p]) => (
          <div key={v} onClick={() => setPlan(v)}
            style={{ border: `2px solid ${plan === v ? C.teal : C.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: plan === v ? C.tealLight : '#fff', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{n}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{d}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.teal, margin: 0 }}>{p}</p>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${plan === v ? C.teal : C.border}`, background: plan === v ? C.teal : '#fff', margin: '4px 0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {plan === v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

const TrialsScreen = () => {
  const [extendModal, setExtendModal] = React.useState(null);
  const [convertModal, setConvertModal] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  const filtered = TRIAL_DATA.filter(t => filter === 'all' || t.status === filter);
  const active = TRIAL_DATA.filter(t => t.status === 'active');
  const expiringSoon = active.filter(t => (t.days - t.used) <= 7);

  return (
    <div className="section-enter">
      <PageHeader
        title="Gestión de Trials"
        sub="Controla los períodos de prueba de cada clínica"
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Trials activos" value={active.length} icon="clock" color={C.teal} />
        <StatCard label="Vencen pronto" value={expiringSoon.length} sub="en los próximos 7 días" icon="alert" color={C.warning} colorLight={C.warningLight} />
        <StatCard label="Convertidos" value={TRIAL_DATA.filter(t=>t.status==='converted').length} sub="este mes" icon="zap" color={C.success} colorLight={C.successLight} />
      </div>

      {/* Alert for expiring */}
      {expiringSoon.length > 0 && (
        <div style={{ background: C.warningLight, border: `1px solid #FDE68A`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="alert" size={16} color={C.warning} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>Atención: {expiringSoon.length} trial{expiringSoon.length > 1 ? 's' : ''} por vencer</p>
            <p style={{ fontSize: 12, color: '#92400E', margin: '2px 0 0' }}>{expiringSoon.map(t => t.clinic).join(', ')} — considera extender o contactar al cliente.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setExtendModal(expiringSoon[0])}>Extender ahora</Button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 16 }}>
        {[['all','Todos'],['active','Activos'],['converted','Convertidos'],['expired','Vencidos']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === v ? C.teal : 'transparent', color: filter === v ? '#fff' : C.muted, transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>

      <Card padding="0">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
              {['Clínica', 'Contacto', 'Período', 'Progreso', 'Estado', ''].map(h => (
                <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.tealDark, flexShrink: 0 }}>
                      {t.clinic.charAt(0)}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{t.clinic}</p>
                  </div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{t.contact}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{t.email}</p>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>
                  <p style={{ margin: 0 }}>{t.start}</p>
                  <p style={{ margin: 0 }}>→ {t.end}</p>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {t.status === 'active' ? <TrialBar used={t.used} total={t.days} /> : <span style={{ fontSize: 12, color: C.muted }}>—</span>}
                </td>
                <td style={{ padding: '14px 20px' }}><TrialStatusBadge s={t.status} /></td>
                <td style={{ padding: '14px 20px' }}>
                  {t.status === 'active' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => setExtendModal(t)}>Extender</Button>
                      <Button variant="outline" size="sm" onClick={() => setConvertModal(t)}>Convertir</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ExtendModal open={!!extendModal} onClose={() => setExtendModal(null)} trial={extendModal} />
      <ConvertModal open={!!convertModal} onClose={() => setConvertModal(null)} trial={convertModal} />
    </div>
  );
};


export default TrialsScreen;

