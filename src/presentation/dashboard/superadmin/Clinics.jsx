"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import React from "react";
import { C, Icon, Badge, Button, Toggle, Input, Select, Modal, Card, SearchInput, ProgressBar, EmptyState, PageHeader, StatCard } from "./shared";
// ─── ZENSYA ADMIN — CLÍNICAS (Cards + Detail Panel) ──────────────────────────

const MOCK_CLINICS = [
  { id: 1, name: 'Clínica Munay', rut: '76.123.456-7', specialty: 'Medicina General', plan: 'Pro', status: 'active', users: 14, db: 72, created: '12 Ene 2025', trial: null, city: 'Santiago', modules: ['agenda','pacientes','fichas','facturacion','reportes','inventario','rrhh'], color: '#0E7490' },
  { id: 2, name: 'Clínica Vitalia', rut: '77.234.567-8', specialty: 'Kinesiología', plan: 'Trial', status: 'trial', users: 3, db: 18, created: '18 Abr 2025', trial: '18 May 2025', city: 'Viña del Mar', modules: ['agenda','pacientes','fichas','telemedicina'], color: '#7C3AED' },
  { id: 3, name: 'Centro Médico Norte', rut: '78.345.678-9', specialty: 'Multiespecialidad', plan: 'Starter', status: 'active', users: 7, db: 41, created: '03 Feb 2025', trial: null, city: 'Antofagasta', modules: ['agenda','pacientes','fichas','facturacion','reportes'], color: '#059669' },
  { id: 4, name: 'Clínica Verde', rut: '79.456.789-0', specialty: 'Odontología', plan: 'Pro', status: 'active', users: 11, db: 58, created: '27 Ene 2025', trial: null, city: 'Concepción', modules: ['agenda','pacientes','fichas','facturacion','reportes','marketing'], color: '#D97706' },
  { id: 5, name: 'BioSalud', rut: '80.567.890-1', specialty: 'Nutrición', plan: 'Trial', status: 'trial', users: 2, db: 5, created: '20 Abr 2025', trial: '20 May 2025', city: 'Temuco', modules: ['agenda','pacientes','fichas'], color: '#DC2626' },
];

const ALL_MODULES = [
  { id: 'agenda',       name: 'Agenda',           icon: 'calendar', desc: 'Citas y horarios', color: '#0E7490', category: 'core' },
  { id: 'pacientes',    name: 'Pacientes',         icon: 'users',    desc: 'Registro de pacientes', color: '#059669', category: 'core' },
  { id: 'fichas',       name: 'Fichas Clínicas',   icon: 'edit',     desc: 'Historial clínico digital', color: '#7C3AED', category: 'core' },
  { id: 'facturacion',  name: 'Facturación',       icon: 'package',  desc: 'Cobros y pagos', color: '#D97706', category: 'core' },
  { id: 'reportes',     name: 'Reportes',          icon: 'activity', desc: 'Estadísticas y dashboards', color: '#0891B2', category: 'core' },
  { id: 'inventario',   name: 'Inventario',        icon: 'server',   desc: 'Control de insumos', color: '#B08D57', category: 'core' },
  { id: 'rrhh',         name: 'RRHH',              icon: 'user',     desc: 'Gestión de personal', color: '#DB2777', category: 'core' },
  { id: 'telemedicina', name: 'Telemedicina',      icon: 'wifi',     desc: 'Video consultas', color: '#164E63', category: 'core' },
  { id: 'marketing',    name: 'Marketing',         icon: 'zap',      desc: 'Campañas y fidelización', color: '#DC2626', category: 'advanced' },
  { id: 'llm',          name: 'IA / LLM',          icon: 'key',      desc: 'Asistente clínico con IA', color: '#7C3AED', category: 'advanced' },
  { id: 'analytics',    name: 'Analytics Pro',     icon: 'chart',    desc: 'Métricas avanzadas', color: '#0E7490', category: 'advanced' },
  { id: 'integraciones',name: 'Integraciones',     icon: 'link',     desc: 'APIs y conectores externos', color: '#059669', category: 'advanced' },
];

// -- users per clinic
const CLINIC_USERS = {
  1: [
    { id:1, name:'Dr. Carlos Martínez', email:'carlos@munay.cl', role:'Médico', status:'active', last:'Hoy 09:14', avatar:'CM' },
    { id:2, name:'Ana López', email:'ana@munay.cl', role:'Recepcionista', status:'active', last:'Hoy 08:52', avatar:'AL' },
    { id:3, name:'Felipe Castro', email:'fcastro@munay.cl', role:'Médico', status:'active', last:'Hoy 07:30', avatar:'FC' },
    { id:4, name:'Sandra Pérez', email:'sperez@munay.cl', role:'Enfermero', status:'active', last:'Ayer', avatar:'SP' },
  ],
  2: [
    { id:5, name:'Dr. Patricia Soto', email:'psoto@vitalia.cl', role:'Admin Clínica', status:'active', last:'Ayer', avatar:'PS' },
    { id:6, name:'Marco Ruiz', email:'mruiz@vitalia.cl', role:'Recepcionista', status:'active', last:'Hace 2 días', avatar:'MR' },
  ],
  3: [
    { id:7, name:'Jorge Fuentes', email:'jfuentes@norte.cl', role:'Médico', status:'active', last:'Hace 3 días', avatar:'JF' },
    { id:8, name:'Claudia Herrera', email:'cherrera@norte.cl', role:'Admin Clínica', status:'active', last:'Hoy', avatar:'CH' },
  ],
  4: [
    { id:9, name:'Camila Rojas', email:'crojas@verde.cl', role:'Recepcionista', status:'active', last:'Hoy 10:01', avatar:'CR' },
    { id:10, name:'Dr. Martín Vega', email:'mvega@verde.cl', role:'Médico', status:'inactive', last:'Hace 2 sem', avatar:'MV' },
  ],
  5: [
    { id:11, name:'Laura Muñoz', email:'lmunoz@biosalud.cl', role:'Admin Clínica', status:'active', last:'Hace 1h', avatar:'LM' },
  ],
};

// -- neon/vercel per clinic
const CLINIC_RESOURCES = {
  1: { storage: 720, connections: 18, compute: 42, bandwidth: 8.2, builds: 14, invocations: 142000 },
  2: { storage: 180, connections: 4,  compute: 8,  bandwidth: 0.4, builds: 3,  invocations: 8200 },
  3: { storage: 410, connections: 9,  compute: 24, bandwidth: 3.1, builds: 7,  invocations: 54000 },
  4: { storage: 580, connections: 12, compute: 33, bandwidth: 5.8, builds: 11, invocations: 98000 },
  5: { storage: 50,  connections: 3,  compute: 5,  bandwidth: 0.1, builds: 2,  invocations: 2100 },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const statusBadge = (s) => {
  if (s === 'active') return <Badge variant="success">Activa</Badge>;
  if (s === 'trial') return <Badge variant="gold">Trial</Badge>;
  if (s === 'inactive') return <Badge variant="default">Inactiva</Badge>;
  return null;
};
const planBadge = (p) => {
  if (p === 'Pro') return <Badge variant="teal">Pro</Badge>;
  if (p === 'Starter') return <Badge variant="default">Starter</Badge>;
  if (p === 'Trial') return <Badge variant="gold">Trial</Badge>;
  return null;
};
const AVATAR_COLORS = ['#0E7490','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];

// ─── CLINIC CARD ─────────────────────────────────────────────────────────────
const ClinicCard = ({ clinic, onClick }) => {
  const [hov, setHov] = React.useState(false);
  const res = CLINIC_RESOURCES[clinic.id];
  const dbPct = Math.round((res.storage / 1000) * 100);
  const moduleDefs = clinic.modules.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 14, border: `1.5px solid ${hov ? clinic.color + '60' : C.border}`,
        cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s',
        boxShadow: hov ? `0 8px 32px ${clinic.color}18` : '0 1px 4px rgba(11,22,40,0.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}>
      {/* Color bar */}
      <div style={{ height: 4, background: clinic.color }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: clinic.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: clinic.color, flexShrink: 0 }}>
              {clinic.name.charAt(0)}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.2 }}>{clinic.name}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>{clinic.specialty} · {clinic.city}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {statusBadge(clinic.status)}
            {planBadge(clinic.plan)}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Usuarios', value: clinic.users, icon: 'users' },
            { label: 'Módulos', value: clinic.modules.length, icon: 'grid' },
            { label: 'DB', value: `${dbPct}%`, icon: 'database', warn: dbPct > 70 },
          ].map(s => (
            <div key={s.label} style={{ background: C.bgSoft, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: s.warn ? C.danger : C.text, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Modules chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {moduleDefs.slice(0, 5).map(m => (
            <span key={m.id} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: m.color + '15', color: m.color, fontWeight: 700, border: `1px solid ${m.color}30` }}>{m.name}</span>
          ))}
          {clinic.modules.length > 5 && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: C.bg, color: C.muted, fontWeight: 600 }}>+{clinic.modules.length - 5}</span>
          )}
        </div>

        {/* DB bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Storage Neon</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: dbPct > 70 ? C.danger : C.muted }}>{res.storage} MB / 1 GB</span>
          </div>
          <ProgressBar value={res.storage} max={1000} height={5} showLabel={false} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bgSoft }}>
        <span style={{ fontSize: 11, color: C.subtle }}>Creada {clinic.created}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: clinic.color }}>
          Configurar <Icon name="chevronRight" size={13} color={clinic.color} />
        </div>
      </div>
    </div>
  );
};

// ─── CLINIC DETAIL PANEL ─────────────────────────────────────────────────────
const DETAIL_TABS = [
  { id: 'overview',  label: 'Resumen',       icon: 'dashboard' },
  { id: 'modules',   label: 'Módulos',       icon: 'grid' },
  { id: 'users',     label: 'Usuarios',      icon: 'users' },
  { id: 'resources', label: 'Recursos',      icon: 'server' },
  { id: 'settings',  label: 'Configuración', icon: 'settings' },
];

const ClinicDetail = ({ clinic, onBack }) => {
  const [tab, setTab] = React.useState('overview');
  const [modules, setModules] = React.useState([...clinic.modules]);
  const [saved, setSaved] = React.useState(false);
  const res = CLINIC_RESOURCES[clinic.id];
  const users = CLINIC_USERS[clinic.id] || [];

  const toggleModule = (id) => {
    setModules(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);
    setSaved(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const renderTab = () => {
    if (tab === 'overview') return <ClinicDetailOverview clinic={clinic} res={res} users={users} modules={modules} />;
    if (tab === 'modules') return <ClinicDetailModules modules={modules} toggleModule={toggleModule} onSave={handleSave} saved={saved} />;
    if (tab === 'users') return <ClinicDetailUsers users={users} clinic={clinic} clinicModules={modules} />;
    if (tab === 'resources') return <ClinicDetailResources res={res} clinic={clinic} />;
    if (tab === 'settings') return <ClinicDetailSettings clinic={clinic} />;
  };

  return (
    <div className="section-enter">
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: 'inherit' }}>
          <Icon name="chevronLeft" size={13} /> Clínicas
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: clinic.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: clinic.color }}>
          {clinic.name.charAt(0)}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, lineHeight: 1 }}>{clinic.name}</h1>
          <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{clinic.specialty} · {clinic.city} · RUT {clinic.rut}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {statusBadge(clinic.status)}{planBadge(clinic.plan)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {DETAIL_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? clinic.color : C.muted,
                borderBottom: `2px solid ${isActive ? clinic.color : 'transparent'}`,
                marginBottom: -2, transition: 'all 0.15s',
              }}>
              <Icon name={t.icon} size={14} color={isActive ? clinic.color : C.muted} />
              {t.label}
            </button>
          );
        })}
      </div>

      {renderTab()}
    </div>
  );
};

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
const ClinicDetailOverview = ({ clinic, res, users, modules }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <StatCard label="Usuarios" value={users.length} icon="users" color={C.teal} />
      <StatCard label="Módulos activos" value={modules.length} sub={`de ${ALL_MODULES.length} disponibles`} icon="grid" color={C.purple} colorLight={C.purpleLight} />
      <StatCard label="Storage DB" value={`${res.storage}MB`} sub={`${Math.round(res.storage/10)}% de 1 GB`} icon="database" color={res.storage > 700 ? C.danger : C.teal} colorLight={res.storage > 700 ? C.dangerLight : C.tealLight} />
      <StatCard label="Invocaciones" value={`${(res.invocations/1000).toFixed(0)}k`} sub="funciones / mes" icon="zap" color={C.warning} colorLight={C.warningLight} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Usuarios de la clínica</h3>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[u.id % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{u.name}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{u.role}</p>
            </div>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: u.status === 'active' ? C.success : C.borderMid }} />
          </div>
        ))}
      </Card>
      <Card>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Módulos activos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modules.map(id => {
            const m = ALL_MODULES.find(x => x.id === id);
            if (!m) return null;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: m.color + '10', border: `1px solid ${m.color}25` }}>
                <Icon name={m.icon} size={13} color={m.color} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{m.name}</span>
                <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{m.desc}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  </div>
);

// ─── MODULES TAB ─────────────────────────────────────────────────────────────
const ClinicDetailModules = ({ modules, toggleModule, onSave, saved }) => {
  const core = ALL_MODULES.filter(m => m.category === 'core');
  const advanced = ALL_MODULES.filter(m => m.category === 'advanced');

  const ModuleGroup = ({ title, mods, badge }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</h3>
        {badge}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {mods.map(m => {
          const on = modules.includes(m.id);
          return (
            <div key={m.id} onClick={() => toggleModule(m.id)}
              style={{
                border: `2px solid ${on ? m.color : C.border}`, borderRadius: 12, padding: '14px 16px',
                cursor: 'pointer', transition: 'all 0.15s', background: on ? m.color + '0D' : '#fff',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icon} size={16} color={m.color} />
                </div>
                <Toggle value={on} onChange={() => toggleModule(m.id)} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>{m.name}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.muted }}>{modules.length} de {ALL_MODULES.length} módulos activos</p>
        <Button variant="primary" icon="check" onClick={onSave}>{saved ? '¡Guardado!' : 'Guardar cambios'}</Button>
      </div>
      <ModuleGroup title="Módulos Core" mods={core} badge={<Badge variant="default" size="xs">Incluidos en todos los planes</Badge>} />
      <ModuleGroup title="Módulos Avanzados" mods={advanced} badge={<Badge variant="purple" size="xs">Plan Pro o add-on</Badge>} />
    </div>
  );
};

// ─── USER PERMISSIONS DATA ────────────────────────────────────────────────────
const USER_PERMISSIONS_GROUPS = [
  { group: 'Pacientes', items: [
    { id: 'p_view', label: 'Ver pacientes' }, { id: 'p_create', label: 'Crear pacientes' },
    { id: 'p_edit', label: 'Editar pacientes' }, { id: 'p_delete', label: 'Eliminar pacientes' },
  ]},
  { group: 'Agenda', items: [
    { id: 'a_view', label: 'Ver agenda' }, { id: 'a_manage', label: 'Gestionar citas' }, { id: 'a_block', label: 'Bloquear horarios' },
  ]},
  { group: 'Reportes', items: [
    { id: 'r_view', label: 'Ver reportes' }, { id: 'r_export', label: 'Exportar datos' },
  ]},
  { group: 'Configuración', items: [
    { id: 'c_view', label: 'Ver configuración' }, { id: 'c_edit', label: 'Editar configuración' },
  ]},
];

const ROLE_DEFAULT_PERMS = {
  'Admin Clínica':  { p_view:1,p_create:1,p_edit:1,p_delete:0,a_view:1,a_manage:1,a_block:1,r_view:1,r_export:1,c_view:1,c_edit:1 },
  'Médico':         { p_view:1,p_create:1,p_edit:1,p_delete:0,a_view:1,a_manage:1,a_block:1,r_view:1,r_export:0,c_view:0,c_edit:0 },
  'Recepcionista':  { p_view:1,p_create:1,p_edit:0,p_delete:0,a_view:1,a_manage:1,a_block:0,r_view:0,r_export:0,c_view:0,c_edit:0 },
  'Enfermero':      { p_view:1,p_create:0,p_edit:1,p_delete:0,a_view:1,a_manage:0,a_block:0,r_view:0,r_export:0,c_view:0,c_edit:0 },
};

// ─── USER CONFIG DRAWER ───────────────────────────────────────────────────────
const UserConfigDrawer = ({ user, open, onClose, clinicModules }) => {
  const [drawerTab, setDrawerTab] = React.useState('role');
  const [role, setRole] = React.useState(user?.role || 'Médico');
  const [customPerms, setCustomPerms] = React.useState({});
  const [temporalOn, setTemporalOn] = React.useState(false);
  const [temporalExpiry, setTemporalExpiry] = React.useState('');
  const [temporalDays, setTemporalDays] = React.useState('30');
  const [visibleSections, setVisibleSections] = React.useState(['agenda','pacientes','fichas']);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (user) { setRole(user.role); setCustomPerms({}); setTemporalOn(false); setDrawerTab('role'); setSaved(false); }
  }, [user?.id]);

  if (!user) return null;

  const basePerms = ROLE_DEFAULT_PERMS[role] || {};
  const effectivePerm = (id) => customPerms[id] !== undefined ? customPerms[id] : (basePerms[id] || 0);
  const isOverride = (id) => customPerms[id] !== undefined && customPerms[id] !== (basePerms[id] || 0);

  const togglePerm = (id) => {
    const current = effectivePerm(id);
    const base = basePerms[id] || 0;
    const newVal = current ? 0 : 1;
    setCustomPerms(p => newVal === base ? (({ [id]: _, ...rest }) => rest)(p) : { ...p, [id]: newVal });
    setSaved(false);
  };

  const toggleSection = (id) => setVisibleSections(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  const allMods = ALL_MODULES;
  const clinicActiveModules = allMods.filter(m => clinicModules?.includes(m.id));

  const DRAWER_TABS = [
    { id: 'role', label: 'Rol' },
    { id: 'perms', label: 'Permisos exclusivos' },
    { id: 'temporal', label: 'Acceso temporal' },
  ];

  const avatarColor = AVATAR_COLORS[user.id % AVATAR_COLORS.length];

  return (
    <>
      {/* Overlay */}
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,22,40,0.35)', zIndex: 500, backdropFilter: 'blur(1px)' }} />}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#fff', zIndex: 600, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(11,22,40,0.16)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{user.avatar}</div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{user.name}</h3>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 6, display: 'flex' }}>
              <Icon name="x" size={18} />
            </button>
          </div>
          {/* Drawer tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 16, borderBottom: `2px solid ${C.border}`, marginBottom: -1 }}>
            {DRAWER_TABS.map(t => (
              <button key={t.id} onClick={() => setDrawerTab(t.id)}
                style={{ padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: drawerTab===t.id ? 700 : 500, color: drawerTab===t.id ? C.teal : C.muted, borderBottom: `2px solid ${drawerTab===t.id ? C.teal : 'transparent'}`, marginBottom: -2, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {t.label}
                {t.id === 'perms' && Object.keys(customPerms).length > 0 && (
                  <span style={{ marginLeft: 6, background: C.teal, color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>{Object.keys(customPerms).length}</span>
                )}
                {t.id === 'temporal' && temporalOn && (
                  <span style={{ marginLeft: 6, background: C.warning, color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>ON</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ─── ROLE TAB ─── */}
          {drawerTab === 'role' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Selecciona el rol base. Los permisos exclusivos pueden ajustarse en la siguiente pestaña.</p>
              {['Admin Clínica','Médico','Recepcionista','Enfermero'].map(r => {
                const colors = { 'Admin Clínica': C.teal, 'Médico': C.purple, 'Recepcionista': C.success, 'Enfermero': C.warning };
                const descs = { 'Admin Clínica':'Gestión completa de la clínica', 'Médico':'Acceso clínico y agenda', 'Recepcionista':'Agenda y registro de pacientes', 'Enfermero':'Fichas y atención' };
                const isActive = role === r;
                return (
                  <div key={r} onClick={() => { setRole(r); setCustomPerms({}); setSaved(false); }}
                    style={{ border: `2px solid ${isActive ? colors[r] : C.border}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', background: isActive ? colors[r]+'0D' : '#fff', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[r], flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{r}</p>
                          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{descs[r]}</p>
                        </div>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isActive ? colors[r] : C.border}`, background: isActive ? colors[r] : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {Object.entries(ROLE_DEFAULT_PERMS[r]||{}).filter(([,v])=>v).map(([k]) => (
                          <span key={k} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: colors[r]+'15', color: colors[r], fontWeight: 600, border: `1px solid ${colors[r]}30` }}>
                            {USER_PERMISSIONS_GROUPS.flatMap(g=>g.items).find(i=>i.id===k)?.label || k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── PERMISOS EXCLUSIVOS TAB ─── */}
          {drawerTab === 'perms' && (
            <div>
              <div style={{ background: C.bgSoft, borderRadius: 8, padding: '10px 12px', marginBottom: 16, display: 'flex', gap: 8 }}>
                <Icon name="info" size={13} color={C.teal} />
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Los permisos con <span style={{ color: C.teal, fontWeight: 700 }}>borde azul</span> difieren del rol base <strong>{role}</strong>. Los cambios aplican solo a este usuario.</p>
              </div>
              {USER_PERMISSIONS_GROUPS.map(group => (
                <div key={group.group} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{group.group}</p>
                  {group.items.map(perm => {
                    const on = !!effectivePerm(perm.id);
                    const override = isOverride(perm.id);
                    return (
                      <div key={perm.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 4, border: `1.5px solid ${override ? C.teal : C.border}`, background: override ? C.tealLight : '#fff', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: on ? C.tealLight : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={on ? 'check' : 'x'} size={11} color={on ? C.teal : C.borderMid} />
                          </div>
                          <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{perm.label}</span>
                          {override && <Badge variant="teal" size="xs">Personalizado</Badge>}
                        </div>
                        <Toggle value={on} onChange={() => togglePerm(perm.id)} />
                      </div>
                    );
                  })}
                </div>
              ))}
              {Object.keys(customPerms).length > 0 && (
                <button onClick={() => setCustomPerms({})} style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Restablecer a valores del rol
                </button>
              )}
            </div>
          )}

          {/* ─── ACCESO TEMPORAL TAB ─── */}
          {drawerTab === 'temporal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Master toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 10, border: `2px solid ${temporalOn ? C.warning : C.border}`, background: temporalOn ? C.warningLight : '#fff', transition: 'all 0.2s' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Acceso temporal activo</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>Restringe lo que este usuario puede ver por un período</p>
                </div>
                <Toggle value={temporalOn} onChange={setTemporalOn} />
              </div>

              {temporalOn && (
                <>
                  {/* Duration */}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Duración del acceso temporal</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                      {['7','14','30','60'].map(d => (
                        <button key={d} onClick={() => setTemporalDays(d)}
                          style={{ padding: '8px 0', borderRadius: 8, border: `2px solid ${temporalDays===d ? C.warning : C.border}`, background: temporalDays===d ? C.warningLight : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: temporalDays===d ? '#92400E' : C.muted, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* What they can see */}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Secciones visibles durante este período</p>
                    <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>El usuario solo verá las secciones marcadas mientras esté en modo configuración.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {clinicActiveModules.map(m => {
                        const on = visibleSections.includes(m.id);
                        return (
                          <div key={m.id} onClick={() => toggleSection(m.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${on ? m.color : C.border}`, background: on ? m.color+'0D' : '#fff', transition: 'all 0.15s' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: m.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon name={m.icon} size={13} color={m.color} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{m.name}</span>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? m.color : C.border}`, background: on ? m.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {on && <Icon name="check" size={9} color="#fff" strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ background: C.warningLight, border: `1px solid #FDE68A`, borderRadius: 8, padding: '10px 13px', display: 'flex', gap: 8 }}>
                    <Icon name="alert" size={14} color={C.warning} />
                    <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>El acceso temporal vencerá en <strong>{temporalDays} días</strong>. Después el usuario volverá a su rol normal.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" onClick={() => { setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 1200); }}>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </>
  );
};

// ─── USERS TAB ───────────────────────────────────────────────────────────────
const ClinicDetailUsers = ({ users, clinic, clinicModules }) => {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);

  const roleBadge = (r) => {
    const map = { 'Admin Clínica': 'teal', 'Médico': 'purple', 'Recepcionista': 'default', 'Enfermero': 'success' };
    return <Badge variant={map[r] || 'default'}>{r}</Badge>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.muted }}>{users.length} usuarios · haz clic en un usuario para configurarlo</p>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>Agregar usuario</Button>
      </div>
      <Card padding="0">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
              {['Usuario', 'Rol', 'Estado', 'Último acceso', 'Acceso temporal', ''].map(h => (
                <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.tealLight}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: AVATAR_COLORS[u.id % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.avatar}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{u.name}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>{roleBadge(u.role)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: u.status === 'active' ? C.success : C.borderMid }} />
                    <span style={{ fontSize: 12, color: u.status === 'active' ? C.success : C.muted, fontWeight: 500 }}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: C.muted }}>{u.last}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge variant="default" size="xs">—</Badge>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.teal, fontSize: 11, fontWeight: 600 }}>
                    Configurar <Icon name="chevronRight" size={12} color={C.teal} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* User config drawer */}
      <UserConfigDrawer user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} clinicModules={clinicModules} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`Nuevo usuario — ${clinic.name}`} width={440}
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button variant="primary">Crear</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre completo" value="" onChange={() => {}} placeholder="Dr. Juan Pérez" required />
          <Input label="Email" value="" onChange={() => {}} placeholder="juan@clinica.cl" type="email" required />
          <Select label="Rol" value="" onChange={() => {}} options={[{value:'',label:'Seleccionar...'},{value:'medico',label:'Médico'},{value:'admin',label:'Admin Clínica'},{value:'recep',label:'Recepcionista'},{value:'enf',label:'Enfermero'}]} required />
          <Input label="Contraseña temporal" value="" onChange={() => {}} type="password" helper="El usuario deberá cambiarla en el primer acceso" />
        </div>
      </Modal>
    </div>
  );
};

// ─── RESOURCES TAB ────────────────────────────────────────────────────────────
const ClinicDetailResources = ({ res, clinic }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Neon */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#00E59918', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="database" size={16} color="#00A36C" />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Neon DB</h3>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: 'monospace' }}>zensya-{clinic.name.toLowerCase().replace(/\s/g,'-').replace(/[^a-z-]/g,'')}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.success }} />
            <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>Healthy</span>
          </div>
        </div>
        {[
          { label: 'Storage', value: res.storage, max: 1000, unit: 'MB', color: C.teal },
          { label: 'Conexiones', value: res.connections, max: 50, unit: '', color: C.purple },
        ].map(m => (
          <div key={m.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{m.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.value}{m.unit} / {m.max}{m.unit}</span>
            </div>
            <ProgressBar value={m.value} max={m.max} height={7} showLabel={false} color={m.color} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.muted }}>Compute hours/mes</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{res.compute}h</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="secondary" size="sm" icon="eye" style={{ flex: 1 }}>Dashboard Neon</Button>
          <Button variant="ghost" size="sm" icon="database">Consola SQL</Button>
        </div>
      </Card>

      {/* Vercel */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#00000010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="zap" size={16} color="#000" />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Vercel</h3>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: 'monospace' }}>zensya-{clinic.name.split(' ')[clinic.name.split(' ').length-1].toLowerCase()}.vercel.app</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.success }} />
            <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>Active</span>
          </div>
        </div>
        {[
          { label: 'Bandwidth', value: res.bandwidth, max: 20, unit: 'GB', color: C.success },
        ].map(m => (
          <div key={m.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{m.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.value}{m.unit} / {m.max}{m.unit}</span>
            </div>
            <ProgressBar value={m.value} max={m.max} height={7} showLabel={false} color={m.color} />
          </div>
        ))}
        {[
          ['Invocaciones / mes', `${(res.invocations/1000).toFixed(1)}k`],
          ['Builds este mes', res.builds],
          ['Último deploy', 'Hace 2 días'],
        ].map(([l,v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="secondary" size="sm" icon="eye" style={{ flex: 1 }}>Dashboard Vercel</Button>
          <Button variant="ghost" size="sm" icon="zap">Redeploy</Button>
        </div>
      </Card>
    </div>
  </div>
);

// ─── SETTINGS TAB ────────────────────────────────────────────────────────────
const ClinicDetailSettings = ({ clinic }) => {
  const [form, setForm] = React.useState({ name: clinic.name, rut: clinic.rut, specialty: clinic.specialty, city: clinic.city, plan: clinic.plan.toLowerCase(), email: `admin@${clinic.name.split(' ')[0].toLowerCase()}.cl` });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saved, setSaved] = React.useState(false);
  const [configMode, setConfigMode] = React.useState(false);
  const [configSections, setConfigSections] = React.useState(['agenda','pacientes','fichas']);
  const [configMsg, setConfigMsg] = React.useState('Tu clínica está en proceso de configuración. Algunas funciones estarán disponibles próximamente.');
  const allMods = ALL_MODULES;
  const clinicMods = allMods.filter(m => clinic.modules?.includes(m.id));
  const toggleSection = (id) => setConfigSections(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Config mode banner */}
      {configMode && (
        <div style={{ background: C.warningLight, border: `1.5px solid #FDE68A`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="alert" size={16} color={C.warning} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>Modo Configuración ACTIVO</p>
            <p style={{ fontSize: 12, color: '#92400E', margin: '2px 0 0' }}>Los usuarios de esta clínica ven una vista limitada hasta que desactives este modo.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setConfigMode(false)}>Desactivar</Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* General info */}
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Información general</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <Input label="Nombre" value={form.name} onChange={v => set('name', v)} required />
            <Input label="RUT" value={form.rut} onChange={v => set('rut', v)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input label="Ciudad" value={form.city} onChange={v => set('city', v)} />
              <Select label="Especialidad" value={form.specialty} onChange={v => set('specialty', v)}
                options={['Medicina General','Odontología','Kinesiología','Nutrición','Multiespecialidad'].map(x=>({value:x,label:x}))} />
            </div>
            <Input label="Email de contacto" value={form.email} onChange={v => set('email', v)} type="email" />
            <Button variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}>{saved ? '¡Guardado!' : 'Guardar cambios'}</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Plan & trial */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Plan & Trial</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Select label="Plan actual" value={form.plan} onChange={v => set('plan', v)}
                options={[{value:'trial',label:'Trial'},{value:'starter',label:'Starter'},{value:'pro',label:'Pro'}]} />
              {clinic.trial && (
                <div style={{ background: C.warningLight, border: `1px solid #FDE68A`, borderRadius: 8, padding: '10px 13px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>Trial activo</p>
                  <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>Vence el {clinic.trial}</p>
                </div>
              )}
              <Button variant="outline">Cambiar plan</Button>
            </div>
          </Card>

          {/* Danger zone */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Zona de peligro</h3>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Estas acciones son irreversibles.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="secondary" icon="alert" style={{ justifyContent: 'flex-start', color: C.warning, borderColor: '#FDE68A' }}>Suspender clínica</Button>
              <Button variant="secondary" icon="trash" style={{ justifyContent: 'flex-start', color: C.danger, borderColor: '#FECACA' }}>Eliminar clínica</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── MODO CONFIGURACIÓN ─── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: configMode ? 20 : 0 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: configMode ? C.warningLight : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
              <Icon name="settings" size={18} color={configMode ? C.warning : C.muted} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Modo Configuración de Clínica</h3>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, maxWidth: 480 }}>
                Cuando está activo, los usuarios de la clínica solo ven las secciones que defines aquí. Ideal para el período de onboarding o setup. Muestra un mensaje personalizado explicando el estado actual.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
            {configMode && <Badge variant="warning">Activo</Badge>}
            <Toggle value={configMode} onChange={setConfigMode} />
          </div>
        </div>

        {configMode && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            {/* Sections visible */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Secciones visibles para los usuarios</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clinicMods.map(m => {
                  const on = configSections.includes(m.id);
                  return (
                    <div key={m.id} onClick={() => toggleSection(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${on ? m.color : C.border}`, background: on ? m.color+'0D' : '#fff', transition: 'all 0.15s' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: m.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={m.icon} size={12} color={m.color} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{m.name}</span>
                      <Toggle value={on} onChange={() => toggleSection(m.id)} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message & progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Mensaje para los usuarios</label>
                <textarea value={configMsg} onChange={e => setConfigMsg(e.target.value)}
                  style={{ width: '100%', minHeight: 90, padding: '10px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
                <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Este mensaje aparecerá en el banner de los usuarios durante el modo configuración.</p>
              </div>

              {/* Preview */}
              <div style={{ background: C.warningLight, border: `1.5px solid #FDE68A`, borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.warning, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Vista previa del banner</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="settings" size={14} color={C.warning} />
                  <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.4 }}>{configMsg}</p>
                </div>
              </div>

              <Button variant="primary" icon="check" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
                {saved ? '¡Guardado!' : 'Guardar configuración'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── WIZARD ───────────────────────────────────────────────────────────────────
const WIZARD_STEPS = ['Datos Básicos', 'Base de Datos', 'Plan & Trial', 'Confirmación'];

const CreateClinicWizard = ({ open, onClose }) => {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState({ name: '', rut: '', specialty: '', city: '', email: '', dbMode: 'auto', plan: 'trial', trialDays: '30', modules: ['agenda','pacientes','fichas'] });
  const [creating, setCreating] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [log, setLog] = React.useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleMod = (id) => set('modules', form.modules.includes(id) ? form.modules.filter(x=>x!==id) : [...form.modules, id]);
  const canNext = () => step === 0 ? form.name.length > 2 && form.rut.length > 4 : true;

  const handleCreate = async () => {
    setCreating(true);
    const steps = ['Validando datos...','Creando proyecto Neon DB...','Configurando branch main...','Ejecutando migraciones...','Creando admin...','Activando módulos...','Configurando trial...','¡Clínica lista!'];
    for (let s of steps) { await new Promise(r => setTimeout(r, 550)); setLog(p => [...p, s]); }
    setCreating(false); setDone(true);
  };

  const handleClose = () => { setStep(0); setForm({name:'',rut:'',specialty:'',city:'',email:'',dbMode:'auto',plan:'trial',trialDays:'30',modules:['agenda','pacientes','fichas']}); setCreating(false); setDone(false); setLog([]); onClose(); };

  const stepContent = () => {
    if (step === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ background: C.tealLight, border: `1px solid #A5F3FC`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
          <Icon name="info" size={14} color={C.teal} />
          <p style={{ fontSize: 12, color: C.tealDark, margin: 0 }}>El setup de base de datos y entorno se realiza automáticamente.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Nombre" value={form.name} onChange={v=>set('name',v)} placeholder="Clínica San Pedro" required />
          <Input label="RUT" value={form.rut} onChange={v=>set('rut',v)} placeholder="76.123.456-7" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Especialidad" value={form.specialty} onChange={v=>set('specialty',v)} options={[{value:'',label:'Seleccionar...'},{value:'general',label:'Medicina General'},{value:'odonto',label:'Odontología'},{value:'kinesi',label:'Kinesiología'},{value:'nutri',label:'Nutrición'},{value:'multi',label:'Multiespecialidad'}]} required />
          <Input label="Ciudad" value={form.city} onChange={v=>set('city',v)} placeholder="Santiago" />
        </div>
        <Input label="Email contacto" value={form.email} onChange={v=>set('email',v)} placeholder="admin@clinica.cl" type="email" />
      </div>
    );
    if (step === 1) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {['auto','manual'].map(mode => (
          <div key={mode} onClick={() => set('dbMode', mode)} style={{ border: `2px solid ${form.dbMode===mode ? C.teal : C.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: form.dbMode===mode ? C.tealLight : '#fff', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icon name={mode==='auto'?'zap':'settings'} size={16} color={form.dbMode===mode ? C.teal : C.muted} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{mode==='auto'?'Automático (recomendado)':'Manual'}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{mode==='auto'?'Neon crea el proyecto vía API':'Usa un proyecto Neon existente'}</p>
                </div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.dbMode===mode ? C.teal : C.border}`, background: form.dbMode===mode ? C.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {form.dbMode===mode && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
    if (step === 2) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Plan" value={form.plan} onChange={v=>set('plan',v)} options={[{value:'trial',label:'Trial'},{value:'starter',label:'Starter'},{value:'pro',label:'Pro'}]} />
          {form.plan==='trial' && <Select label="Duración" value={form.trialDays} onChange={v=>set('trialDays',v)} options={[{value:'7',label:'7 días'},{value:'14',label:'14 días'},{value:'30',label:'30 días'},{value:'60',label:'60 días'}]} />}
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10 }}>Módulos iniciales <span style={{ color: C.danger }}>*</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
            {ALL_MODULES.filter(m=>m.category==='core').map(m => {
              const on = form.modules.includes(m.id);
              return (
                <div key={m.id} onClick={() => toggleMod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${on ? m.color : C.border}`, background: on ? m.color + '10' : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${on ? m.color : C.border}`, background: on ? m.color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {on && <Icon name="check" size={9} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: on ? m.color : C.text }}>{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
    if (step === 3) return (
      <div>
        {!creating && !done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Nombre',form.name],['RUT',form.rut],['DB',form.dbMode==='auto'?'Auto (Neon API)':'Manual'],['Plan',form.plan==='trial'?`Trial ${form.trialDays}d`:form.plan],['Módulos',`${form.modules.length} seleccionados`]].map(([k,v])=>(
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        ) : done ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon name="check" size={22} color={C.success} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 5 }}>¡Clínica creada!</h3>
            <div style={{ background: C.bg, borderRadius: 8, padding: 14, textAlign: 'left', marginTop: 12 }}>
              {log.map((l,i)=><div key={i} style={{ display:'flex',gap:7,alignItems:'center',padding:'2px 0' }}><Icon name="check" size={11} color={C.success}/><span style={{fontSize:12,color:C.text}}>{l}</span></div>)}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 22, height: 22, border: `2.5px solid ${C.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Configurando...</span>
            </div>
            <div style={{ background: C.bg, borderRadius: 8, padding: 14 }}>
              {log.map((l,i)=><div key={i} style={{ display:'flex',gap:7,alignItems:'center',padding:'2px 0' }}><Icon name="check" size={11} color={C.success}/><span style={{fontSize:12}}>{l}</span></div>)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nueva Clínica" width={560}
      footer={done ? <Button variant="primary" onClick={handleClose}>Cerrar</Button> : creating ? null : (
        <>
          {step > 0 && <Button variant="secondary" onClick={()=>setStep(s=>s-1)} icon="chevronLeft">Anterior</Button>}
          <div style={{flex:1}}/>
          {step < 3 ? <Button variant="primary" onClick={()=>setStep(s=>s+1)} disabled={!canNext()}>Siguiente <Icon name="chevronRight" size={14}/></Button>
                    : <Button variant="primary" onClick={handleCreate} icon="zap">Crear Clínica</Button>}
        </>
      )}>
      {!done && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
          {WIZARD_STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: i <= step ? C.teal : C.bg, color: i <= step ? '#fff' : C.muted, border: `2px solid ${i <= step ? C.teal : C.border}` }}>
                  {i < step ? <Icon name="check" size={11} color="#fff" strokeWidth={3}/> : i+1}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: i===step ? C.teal : C.muted, whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < WIZARD_STEPS.length-1 && <div style={{ flex: 1, height: 2, background: i < step ? C.teal : C.border, margin: '0 5px', marginBottom: 14, transition: 'background 0.3s' }}/>}
            </React.Fragment>
          ))}
        </div>
      )}
      {stepContent()}
    </Modal>
  );
};

// ─── CLINICS SCREEN (main) ────────────────────────────────────────────────────
const ClinicsScreen = () => {
  const [detail, setDetail] = React.useState(null);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  if (detail) return <ClinicDetail clinic={detail} onBack={() => setDetail(null)} />;

  const filtered = MOCK_CLINICS.filter(c => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' || c.status === filter;
    return ms && mf;
  });

  return (
    <div className="section-enter">
      <PageHeader
        title="Clínicas"
        sub={`${MOCK_CLINICS.length} clínicas registradas`}
        actions={<Button variant="primary" icon="plus" onClick={() => setWizardOpen(true)}>Nueva Clínica</Button>}
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar clínica o ciudad..." />
        <div style={{ display: 'flex', gap: 5, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {[['all','Todas'],['active','Activas'],['trial','Trial']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter===v ? C.teal : 'transparent', color: filter===v ? '#fff' : C.muted, transition: 'all 0.15s', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {filtered.map(c => <ClinicCard key={c.id} clinic={c} onClick={() => setDetail(c)} />)}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon="building" title="Sin resultados" sub="Intenta con otro filtro o busca por nombre/ciudad" action={<Button variant="primary" icon="plus" onClick={() => setWizardOpen(true)}>Nueva Clínica</Button>} />
          </div>
        )}
      </div>
      <CreateClinicWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
};


export { MOCK_CLINICS, ALL_MODULES };
export default ClinicsScreen;


