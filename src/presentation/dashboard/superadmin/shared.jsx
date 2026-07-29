"use client";

import React from "react";
// ─── ZENSYA ADMIN — SHARED COMPONENTS ───────────────────────────────────────

const C = {
  // Backgrounds
  bg: '#F1F5F9', bgCard: '#FFFFFF', bgSoft: '#F8FAFC',
  sidebar: '#0B1628', sidebarHover: '#162235', sidebarActive: '#1E3A5F',
  // Text
  text: '#0F172A', muted: '#64748B', subtle: '#94A3B8',
  // Borders
  border: '#E2E8F0', borderMid: '#CBD5E1',
  // Brand
  teal: '#0E7490', tealLight: '#ECFEFF', tealMid: '#0891B2',
  tealDark: '#164E63', tealBright: '#4DBFBF',
  // Semantic
  success: '#059669', successLight: '#ECFDF5',
  warning: '#D97706', warningLight: '#FFFBEB',
  danger: '#DC2626', dangerLight: '#FEF2F2',
  purple: '#7C3AED', purpleLight: '#F5F3FF',
  // Gold
  gold: '#B08D57', goldLight: '#FEF9F0',
};

// ─── ICON ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.6 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    building: <><path d="M3 21h18"/><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21V12h6v9"/><path d="M9 7h2"/><path d="M13 7h2"/><path d="M9 11h2"/><path d="M13 11h2"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    server: <><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2"/><line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    chevronRight: <><polyline points="9 18 15 12 9 6"/></>,
    chevronDown: <><polyline points="6 9 12 15 18 9"/></>,
    chevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    arrow_up: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrow_down: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    package: <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3"/></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    toggle: <><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: { bg: C.bgSoft, color: C.muted, border: C.border },
    teal: { bg: C.tealLight, color: C.tealDark, border: '#A5F3FC' },
    success: { bg: C.successLight, color: '#065F46', border: '#A7F3D0' },
    warning: { bg: C.warningLight, color: '#92400E', border: '#FDE68A' },
    danger: { bg: C.dangerLight, color: '#991B1B', border: '#FECACA' },
    purple: { bg: C.purpleLight, color: '#5B21B6', border: '#DDD6FE' },
    gold: { bg: C.goldLight, color: '#78350F', border: '#FDE68A' },
  };
  const v = variants[variant] || variants.default;
  const pad = size === 'xs' ? '2px 6px' : '3px 8px';
  const fs = size === 'xs' ? 10 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 20, fontSize: fs, fontWeight: 600,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
      background: v.bg, color: v.color, border: `1px solid ${v.border}`
    }}>{children}</span>
  );
};

// ─── BUTTON ───────────────────────────────────────────────────────────────────
const Button = ({ children, variant = 'primary', size = 'md', onClick, icon, disabled, style = {} }) => {
  const [hov, setHov] = React.useState(false);
  const variants = {
    primary: { bg: hov ? C.tealDark : C.teal, color: '#fff', border: 'transparent' },
    secondary: { bg: hov ? C.bgSoft : '#fff', color: C.text, border: C.border },
    ghost: { bg: hov ? C.bgSoft : 'transparent', color: C.muted, border: 'transparent' },
    danger: { bg: hov ? '#B91C1C' : C.danger, color: '#fff', border: 'transparent' },
    outline: { bg: hov ? C.tealLight : 'transparent', color: C.teal, border: C.teal },
  };
  const sizes = { sm: { px: 10, py: 6, fs: 12 }, md: { px: 14, py: 8, fs: 13 }, lg: { px: 20, py: 10, fs: 14 } };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        padding: `${s.py}px ${s.px}px`, borderRadius: 8, fontSize: s.fs, fontWeight: 600,
        background: v.bg, color: v.color, border: `1.5px solid ${v.border}`,
        transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit', whiteSpace: 'nowrap', ...style
      }}>
      {icon && <Icon name={icon} size={s.fs + 2} color="currentColor" />}
      {children}
    </button>
  );
};

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, disabled }) => {
  return (
    <div onClick={() => !disabled && onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        background: value ? C.teal : C.borderMid, position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16,
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s'
      }}/>
    </div>
  );
};

// ─── INPUT ────────────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, placeholder, type = 'text', helper, error, icon, required, disabled, style = {} }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </label>}
      <div style={{ position: 'relative' }}>
        {icon && <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.subtle, pointerEvents: 'none' }}>
          <Icon name={icon} size={14} />
        </div>}
        <input value={value} onChange={e => onChange(e.target.value)} type={type}
          placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: icon ? '8px 12px 8px 32px' : '8px 12px',
            border: `1.5px solid ${error ? C.danger : focused ? C.teal : C.border}`,
            borderRadius: 8, fontSize: 13, color: C.text, background: disabled ? C.bg : '#fff',
            outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit',
            boxShadow: focused ? `0 0 0 3px ${C.tealLight}` : 'none',
          }} />
      </div>
      {(helper || error) && <p style={{ fontSize: 11, color: error ? C.danger : C.muted, margin: 0 }}>{error || helper}</p>}
    </div>
  );
};

// ─── SELECT ───────────────────────────────────────────────────────────────────
const Select = ({ label, value, onChange, options = [], required, disabled, style = {} }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </label>}
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{
          padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, color: C.text, background: '#fff', outline: 'none',
          fontFamily: 'inherit', cursor: 'pointer', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          paddingRight: 32, ...style
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

// ─── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width = 560, footer }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(11,22,40,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)', padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: width,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(11,22,40,0.18)',
        animation: 'modalIn 0.2s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, borderRadius: 6, display: 'flex' }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
};

// ─── CARD ─────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {}, hover = false, onClick = undefined, padding = '20px' }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)} onMouseLeave={() => hover && setHov(false)}
      style={{
        background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
        padding, cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov ? '0 4px 16px rgba(11,22,40,0.08)' : '0 1px 3px rgba(11,22,40,0.04)',
        transform: hov ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow 0.2s, transform 0.2s', ...style
      }}>{children}</div>
  );
};

// ─── SEARCH INPUT ─────────────────────────────────────────────────────────────
const SearchInput = ({ value, onChange, placeholder = 'Buscar...' }) => {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.subtle }}>
        <Icon name="search" size={14} />
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          padding: '8px 12px 8px 32px', border: `1.5px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, color: C.text, background: '#fff', outline: 'none', fontFamily: 'inherit', width: 220,
        }} />
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend, icon, color = C.teal, colorLight }) => {
  const bg = colorLight || C.tealLight;
  const isPos = trend && trend > 0;
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</p>}
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
              <Icon name={isPos ? 'arrow_up' : 'arrow_down'} size={12} color={isPos ? C.success : C.danger} />
              <span style={{ fontSize: 11, fontWeight: 600, color: isPos ? C.success : C.danger }}>{Math.abs(trend)}% este mes</span>
            </div>
          )}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          <Icon name={icon} size={18} color={color} />
        </div>
      </div>
    </Card>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max = 100, color = C.teal, height = 6, showLabel = true }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct > 85 ? C.danger : pct > 65 ? C.warning : color;
  return (
    <div>
      <div style={{ background: C.bg, borderRadius: 999, height, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
      {showLabel && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: C.subtle }}>{value} / {max}</span>
      </div>}
    </div>
  );
};

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
const PageHeader = ({ title, sub, actions = null }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 2 }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: C.muted }}>{sub}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
  </div>
);

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px', color: C.muted }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: C.subtle }}>
      <Icon name={icon} size={22} />
    </div>
    <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</p>
    {sub && <p style={{ fontSize: 12 }}>{sub}</p>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

// Export all to window

export { C, Icon, Badge, Button, Toggle, Input, Select, Modal, Card, SearchInput, StatCard, ProgressBar, PageHeader, EmptyState };

