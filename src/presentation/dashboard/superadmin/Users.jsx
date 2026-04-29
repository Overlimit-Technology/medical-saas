"use client";

import React from "react";
import { MOCK_CLINICS } from "./Clinics";
import { C, Icon, Badge, Button, Input, Select, Modal, Card, SearchInput, EmptyState, PageHeader } from "./shared";
// ─── ZENSYA ADMIN — USUARIOS SCREEN ─────────────────────────────────────────

const MOCK_USERS = [
  { id: 1, name: 'Dr. Carlos Martínez', email: 'carlos@munay.cl', role: 'Médico', clinic: 'Clínica Munay', status: 'active', last: 'Hoy 09:14', avatar: 'CM' },
  { id: 2, name: 'Ana López', email: 'ana@munay.cl', role: 'Recepcionista', clinic: 'Clínica Munay', status: 'active', last: 'Hoy 08:52', avatar: 'AL' },
  { id: 3, name: 'Dr. Patricia Soto', email: 'psoto@vitalia.cl', role: 'Admin Clínica', clinic: 'Clínica Vitalia', status: 'active', last: 'Ayer', avatar: 'PS' },
  { id: 4, name: 'Jorge Fuentes', email: 'jfuentes@norte.cl', role: 'Médico', clinic: 'Centro Médico Norte', status: 'active', last: 'Hace 3 días', avatar: 'JF' },
  { id: 5, name: 'Camila Rojas', email: 'crojas@verde.cl', role: 'Recepcionista', clinic: 'Clínica Verde', status: 'active', last: 'Hoy 10:01', avatar: 'CR' },
  { id: 6, name: 'Dr. Martín Vega', email: 'mvega@verde.cl', role: 'Médico', clinic: 'Clínica Verde', status: 'inactive', last: 'Hace 2 sem', avatar: 'MV' },
  { id: 7, name: 'Laura Muñoz', email: 'lmunoz@biosalud.cl', role: 'Admin Clínica', clinic: 'BioSalud', status: 'active', last: 'Hace 1h', avatar: 'LM' },
  { id: 8, name: 'Felipe Castro', email: 'fcastro@munay.cl', role: 'Médico', clinic: 'Clínica Munay', status: 'active', last: 'Hoy 07:30', avatar: 'FC' },
];

const ROLES_LIST = ['Super Admin', 'Admin Clínica', 'Médico', 'Recepcionista', 'Enfermero', 'Contador'];

const AVATAR_COLORS = ['#0E7490','#059669','#7C3AED','#D97706','#DC2626','#0891B2'];

const CreateUserModal = ({ open, onClose }) => {
  const [form, setForm] = React.useState({ name: '', email: '', role: '', clinic: '', password: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Nuevo Usuario" width={480}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" icon="user">Crear Usuario</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Nombre completo" value={form.name} onChange={v => set('name', v)} placeholder="Dr. Juan Pérez" required />
        <Input label="Email" value={form.email} onChange={v => set('email', v)} placeholder="juan@clinica.cl" type="email" required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Clínica" value={form.clinic} onChange={v => set('clinic', v)}
            options={[{value:'',label:'Seleccionar...'}, ...MOCK_CLINICS.map(c => ({value: c.id, label: c.name}))]} required />
          <Select label="Rol" value={form.role} onChange={v => set('role', v)}
            options={[{value:'',label:'Seleccionar...'}, ...ROLES_LIST.map(r => ({value: r, label: r}))]} required />
        </div>
        <Input label="Contraseña temporal" value={form.password} onChange={v => set('password', v)} placeholder="Mínimo 8 caracteres" type="password" helper="El usuario deberá cambiarla en el primer acceso" />
        <div style={{ background: C.tealLight, border: `1px solid #A5F3FC`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
          <Icon name="info" size={14} color={C.teal} />
          <p style={{ fontSize: 12, color: C.tealDark, margin: 0 }}>Se enviará un email de bienvenida con instrucciones de acceso.</p>
        </div>
      </div>
    </Modal>
  );
};

const UsersScreen = () => {
  const [search, setSearch] = React.useState('');
  const [clinicFilter, setClinicFilter] = React.useState('all');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState([]);

  const filtered = MOCK_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchClinic = clinicFilter === 'all' || u.clinic === clinicFilter;
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchClinic && matchRole;
  });

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allSelected = filtered.length > 0 && filtered.every(u => selected.includes(u.id));

  const roleBadge = (r) => {
    const map = { 'Super Admin': 'danger', 'Admin Clínica': 'teal', 'Médico': 'purple', 'Recepcionista': 'default', 'Enfermero': 'success', 'Contador': 'gold' };
    return <Badge variant={map[r] || 'default'}>{r}</Badge>;
  };

  return (
    <div className="section-enter">
      <PageHeader
        title="Usuarios"
        sub={`${MOCK_USERS.length} usuarios en total`}
        actions={<Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Nuevo Usuario</Button>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre o email..." />
        <Select value={clinicFilter} onChange={setClinicFilter}
          options={[{value:'all',label:'Todas las clínicas'}, ...MOCK_CLINICS.map(c => ({value: c.name, label: c.name}))]}
          style={{ width: 180 }} />
        <Select value={roleFilter} onChange={setRoleFilter}
          options={[{value:'all',label:'Todos los roles'}, ...ROLES_LIST.map(r => ({value: r, label: r}))]}
          style={{ width: 170 }} />
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: C.muted }}>{selected.length} seleccionados</span>
            <Button variant="secondary" size="sm">Cambiar rol</Button>
            <Button variant="danger" size="sm" icon="trash">Eliminar</Button>
          </div>
        )}
      </div>

      <Card padding="0">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgSoft }}>
              <th style={{ padding: '12px 16px', width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={() => allSelected ? setSelected([]) : setSelected(filtered.map(u => u.id))} style={{ cursor: 'pointer' }} />
              </th>
              {['Usuario', 'Clínica', 'Rol', 'Estado', 'Último acceso', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const avatarColor = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
              return (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', background: selected.includes(u.id) ? C.tealLight : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!selected.includes(u.id)) e.currentTarget.style.background = C.bgSoft; }}
                  onMouseLeave={e => { if (!selected.includes(u.id)) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 16px' }}>
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.avatar}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{u.name}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.text }}>{u.clinic}</td>
                  <td style={{ padding: '12px 16px' }}>{roleBadge(u.role)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: u.status === 'active' ? C.success : C.borderMid }} />
                      <span style={{ fontSize: 12, color: u.status === 'active' ? C.success : C.muted, fontWeight: 500 }}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.muted }}>{u.last}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 6, display: 'flex' }} title="Editar"><Icon name="edit" size={14} /></button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 6, display: 'flex' }} title="Ver"><Icon name="eye" size={14} /></button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, padding: 4, borderRadius: 6, display: 'flex' }} title="Eliminar"><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="users" title="Sin resultados" sub="Intenta con otro filtro" />}
      </Card>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
};


export default UsersScreen;

