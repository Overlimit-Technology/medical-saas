"use client";

import React from "react";
import { MOCK_CLINICS, ALL_MODULES } from "./Clinics";
import { C, Icon, Badge, Button, Toggle, Card, PageHeader } from "./shared";
// ─── ZENSYA ADMIN — ACCESO A MÓDULOS (Vista global por clínica) ───────────────

const ModulesScreen = ({ onNav }) => {
  // Read live data from MOCK_CLINICS + ALL_MODULES (set by Clinics.jsx)
  const clinics = MOCK_CLINICS || [];
  const allMods = ALL_MODULES || [];

  // Local state for role-level access (global defaults)
  const ROLE_COLS = ['Admin Clínica', 'Médico', 'Recepcionista', 'Enfermero'];
  const DEFAULT_ROLE_ACCESS = {
    agenda:        { 'Admin Clínica':1,'Médico':1,'Recepcionista':1,'Enfermero':1 },
    pacientes:     { 'Admin Clínica':1,'Médico':1,'Recepcionista':1,'Enfermero':1 },
    fichas:        { 'Admin Clínica':1,'Médico':1,'Recepcionista':0,'Enfermero':1 },
    facturacion:   { 'Admin Clínica':1,'Médico':0,'Recepcionista':1,'Enfermero':0 },
    reportes:      { 'Admin Clínica':1,'Médico':1,'Recepcionista':0,'Enfermero':0 },
    inventario:    { 'Admin Clínica':1,'Médico':0,'Recepcionista':0,'Enfermero':1 },
    rrhh:          { 'Admin Clínica':1,'Médico':0,'Recepcionista':0,'Enfermero':0 },
    telemedicina:  { 'Admin Clínica':1,'Médico':1,'Recepcionista':0,'Enfermero':0 },
    marketing:     { 'Admin Clínica':1,'Médico':0,'Recepcionista':0,'Enfermero':0 },
    llm:           { 'Admin Clínica':1,'Médico':1,'Recepcionista':0,'Enfermero':0 },
    analytics:     { 'Admin Clínica':1,'Médico':0,'Recepcionista':0,'Enfermero':0 },
    integraciones: { 'Admin Clínica':1,'Médico':0,'Recepcionista':0,'Enfermero':0 },
  };

  const [view, setView] = React.useState('clinics'); // 'clinics' | 'roles'
  const [roleAccess, setRoleAccess] = React.useState(DEFAULT_ROLE_ACCESS);
  const [saved, setSaved] = React.useState(false);

  const toggleRole = (modId, role) => {
    setRoleAccess(a => ({ ...a, [modId]: { ...a[modId], [role]: a[modId]?.[role] ? 0 : 1 } }));
    setSaved(false);
  };
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // Count active clinics per module
  const clinicCountFor = (modId) => clinics.filter(c => c.modules?.includes(modId)).length;

  return (
    <div className="section-enter">
      <PageHeader
        title="Acceso a Módulos"
        sub="Visión global de módulos por clínica y por rol"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 4 }}>
              {[['clinics','Por clínica'],['roles','Por rol']].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view===v ? C.teal : 'transparent', color: view===v ? '#fff' : C.muted, transition: 'all 0.15s', fontFamily: 'inherit' }}>{l}</button>
              ))}
            </div>
            {view === 'roles' && <Button variant="primary" icon="check" onClick={handleSave}>{saved ? '¡Guardado!' : 'Guardar'}</Button>}
          </div>
        }
      />

      {view === 'clinics' ? (
        <>
          {/* Module summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {allMods.map(m => {
              const count = clinicCountFor(m.id);
              return (
                <Card key={m.id} padding="14px 16px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={m.icon} size={15} color={m.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{m.category === 'advanced' ? 'Avanzado' : 'Core'}</p>
                    </div>
                    {m.category === 'advanced' && <Badge variant="purple" size="xs">Pro</Badge>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ background: C.bg, borderRadius: 999, height: 5, flex: 1, overflow: 'hidden', marginRight: 8 }}>
                      <div style={{ width: `${(count/clinics.length)*100}%`, height: '100%', background: m.color, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.color, whiteSpace: 'nowrap' }}>{count}/{clinics.length}</span>
                  </div>
                  <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>{count} clínica{count !== 1 ? 's' : ''} activa{count !== 1 ? 's' : ''}</p>
                </Card>
              );
            })}
          </div>

          {/* Cross-clinic matrix */}
          <Card padding="0">
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Matriz de módulos por clínica</h3>
              <p style={{ fontSize: 12, color: C.muted }}>Gestiona módulos individuales desde la configuración de cada clínica</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', width: 190, position: 'sticky', left: 0, background: C.bgSoft }}>Clínica</th>
                    {allMods.map(m => (
                      <th key={m.id} style={{ padding: '12px 8px', textAlign: 'center', minWidth: 70 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={m.icon} size={13} color={m.color} />
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clinics.map((clinic, i) => (
                    <tr key={clinic.id} style={{ borderBottom: i < clinics.length - 1 ? `1px solid ${C.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 20px', position: 'sticky', left: 0, background: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: clinic.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: clinic.color, flexShrink: 0 }}>
                            {clinic.name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{clinic.name}</p>
                            <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{clinic.modules?.length || 0} módulos</p>
                          </div>
                        </div>
                      </td>
                      {allMods.map(m => {
                        const on = clinic.modules?.includes(m.id);
                        return (
                          <td key={m.id} style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {on ? (
                              <div style={{ width: 22, height: 22, borderRadius: 6, background: m.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                <Icon name="check" size={12} color={m.color} strokeWidth={2.5} />
                              </div>
                            ) : (
                              <div style={{ width: 22, height: 22, borderRadius: 6, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                <div style={{ width: 8, height: 1, background: C.borderMid, borderRadius: 1 }} />
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => onNav && onNav('clinics')}
                          style={{ fontSize: 11, color: C.teal, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          Configurar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        /* Role-based access matrix */
        <Card padding="0">
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Define qué roles tienen acceso a cada módulo de forma global.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', width: 220 }}>Módulo</th>
                  {ROLE_COLS.map(r => (
                    <th key={r} style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allMods.map((mod, i) => (
                  <tr key={mod.id} style={{ borderBottom: i < allMods.length - 1 ? `1px solid ${C.border}` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: mod.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={mod.icon} size={15} color={mod.color} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{mod.name}</p>
                          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{mod.desc}</p>
                        </div>
                        {mod.category === 'advanced' && <Badge variant="purple" size="xs">Pro</Badge>}
                      </div>
                    </td>
                    {ROLE_COLS.map(role => {
                      const on = !!roleAccess[mod.id]?.[role];
                      return (
                        <td key={role} style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Toggle value={on} onChange={() => toggleRole(mod.id, role)} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};


export default ModulesScreen;


