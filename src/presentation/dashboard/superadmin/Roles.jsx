"use client";

import React from "react";
import { C, Icon, Badge, Button, Input, Select, Modal, Card, PageHeader, Toggle } from "./shared";
// ─── ZENSYA ADMIN — ROLES & PERMISOS ────────────────────────────────────────

const ROLES_DEF = [
  { id: 'super_admin', name: 'Super Admin', desc: 'Acceso total al sistema', color: C.danger, users: 1, system: true },
  { id: 'admin_clinica', name: 'Admin Clínica', desc: 'Gestiona su clínica completa', color: C.teal, users: 5, system: false },
  { id: 'medico', name: 'Médico', desc: 'Acceso clínico y agenda', color: C.purple, users: 18, system: false },
  { id: 'recepcionista', name: 'Recepcionista', desc: 'Agenda y pacientes', color: C.success, users: 9, system: false },
  { id: 'enfermero', name: 'Enfermero', desc: 'Fichas y atención', color: C.warning, users: 4, system: false },
];

const PERMISSIONS = [
  { group: 'Clínica', items: [
    { id: 'clinic_view', label: 'Ver configuración' },
    { id: 'clinic_edit', label: 'Editar configuración' },
    { id: 'clinic_billing', label: 'Ver facturación' },
  ]},
  { group: 'Usuarios', items: [
    { id: 'users_view', label: 'Ver usuarios' },
    { id: 'users_create', label: 'Crear usuarios' },
    { id: 'users_delete', label: 'Eliminar usuarios' },
    { id: 'users_roles', label: 'Cambiar roles' },
  ]},
  { group: 'Pacientes', items: [
    { id: 'patients_view', label: 'Ver pacientes' },
    { id: 'patients_create', label: 'Crear pacientes' },
    { id: 'patients_edit', label: 'Editar pacientes' },
    { id: 'patients_delete', label: 'Eliminar pacientes' },
  ]},
  { group: 'Agenda', items: [
    { id: 'agenda_view', label: 'Ver agenda' },
    { id: 'agenda_manage', label: 'Gestionar citas' },
    { id: 'agenda_block', label: 'Bloquear horarios' },
  ]},
  { group: 'Reportes', items: [
    { id: 'reports_view', label: 'Ver reportes' },
    { id: 'reports_export', label: 'Exportar datos' },
  ]},
];

const DEFAULT_PERMISSIONS = {
  super_admin: { clinic_view:1,clinic_edit:1,clinic_billing:1,users_view:1,users_create:1,users_delete:1,users_roles:1,patients_view:1,patients_create:1,patients_edit:1,patients_delete:1,agenda_view:1,agenda_manage:1,agenda_block:1,reports_view:1,reports_export:1 },
  admin_clinica: { clinic_view:1,clinic_edit:1,clinic_billing:1,users_view:1,users_create:1,users_delete:0,users_roles:1,patients_view:1,patients_create:1,patients_edit:1,patients_delete:0,agenda_view:1,agenda_manage:1,agenda_block:1,reports_view:1,reports_export:1 },
  medico: { clinic_view:1,clinic_edit:0,clinic_billing:0,users_view:0,users_create:0,users_delete:0,users_roles:0,patients_view:1,patients_create:1,patients_edit:1,patients_delete:0,agenda_view:1,agenda_manage:1,agenda_block:1,reports_view:1,reports_export:0 },
  recepcionista: { clinic_view:0,clinic_edit:0,clinic_billing:0,users_view:0,users_create:0,users_delete:0,users_roles:0,patients_view:1,patients_create:1,patients_edit:0,patients_delete:0,agenda_view:1,agenda_manage:1,agenda_block:0,reports_view:0,reports_export:0 },
  enfermero: { clinic_view:0,clinic_edit:0,clinic_billing:0,users_view:0,users_create:0,users_delete:0,users_roles:0,patients_view:1,patients_create:0,patients_edit:1,patients_delete:0,agenda_view:1,agenda_manage:0,agenda_block:0,reports_view:0,reports_export:0 },
};

const RolesScreen = () => {
  const [perms, setPerms] = React.useState(DEFAULT_PERMISSIONS);
  const [activeRole, setActiveRole] = React.useState('admin_clinica');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const toggle = (roleId, permId) => {
    if (ROLES_DEF.find(r => r.id === roleId)?.system) return;
    setPerms(p => ({ ...p, [roleId]: { ...p[roleId], [permId]: p[roleId][permId] ? 0 : 1 } }));
    setSaved(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const allPerms = PERMISSIONS.flatMap(g => g.items);
  const activeCount = (roleId) => allPerms.filter(p => perms[roleId]?.[p.id]).length;

  return (
    <div className="section-enter">
      <PageHeader
        title="Roles & Permisos"
        sub="Define qué puede hacer cada rol en el sistema"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" icon="plus" onClick={() => setCreateOpen(true)}>Nuevo Rol</Button>
            <Button variant="primary" icon="check" onClick={handleSave}>{saved ? '¡Guardado!' : 'Guardar cambios'}</Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        {/* Role list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROLES_DEF.map(r => (
            <div key={r.id} onClick={() => setActiveRole(r.id)}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${activeRole === r.id ? r.color : C.border}`,
                background: activeRole === r.id ? r.color + '10' : '#fff',
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.name}</span>
                    {r.system && <Badge variant="default" size="xs">Sistema</Badge>}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{r.desc}</p>
                </div>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, flexShrink: 0 }}>{r.users} usuarios</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>{activeCount(r.id)}/{allPerms.length} permisos</div>
                <div style={{ background: C.bg, borderRadius: 999, height: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(activeCount(r.id)/allPerms.length)*100}%`, height: '100%', background: r.color, borderRadius: 999 }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Permission matrix */}
        <Card padding="0">
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(() => { const r = ROLES_DEF.find(x => x.id === activeRole); return (
                <>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{r.name}</h3>
                  {r.system && <Badge variant="danger" size="xs">Solo lectura</Badge>}
                </>
              ); })()}
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>{activeCount(activeRole)} de {allPerms.length} permisos activos</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 520 }}>
            {PERMISSIONS.map(group => (
              <div key={group.group}>
                <div style={{ padding: '10px 20px', background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group.group}</span>
                </div>
                {group.items.map(perm => {
                  const isActive = !!perms[activeRole]?.[perm.id];
                  const isSystem = ROLES_DEF.find(r => r.id === activeRole)?.system;
                  return (
                    <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: isActive ? C.tealLight : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={isActive ? 'check' : 'x'} size={13} color={isActive ? C.teal : C.borderMid} />
                        </div>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{perm.label}</span>
                      </div>
                      <Toggle value={isActive} onChange={() => toggle(activeRole, perm.id)} disabled={isSystem} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Rol" width={440}
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button variant="primary">Crear Rol</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre del rol" value="" onChange={() => {}} placeholder="Ej: Kinesiólogo" required />
          <Input label="Descripción" value="" onChange={() => {}} placeholder="Breve descripción del rol" />
          <Select label="Basado en" value="" onChange={() => {}}
            options={[{value:'',label:'Desde cero'}, ...ROLES_DEF.filter(r=>!r.system).map(r=>({value:r.id,label:r.name}))]}
            helper="Copia los permisos de un rol existente como punto de partida" />
        </div>
      </Modal>
    </div>
  );
};


export default RolesScreen;

