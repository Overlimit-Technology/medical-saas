"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { DashClinicRow } from "@/server/super-admin/dashboardCalc";
import { Badge } from "../SuperAdminPrimitives";
import { actionMenu, type ActionKind } from "./ClinicActions";
import { EVENT_LABEL, STATUS_LABEL, api, clp, dateLabel, dateTimeLabel, num, statusTone } from "./format";
import { Field, btnGhost, btnPrimary, inputClass } from "./ui";

type Detail = {
  clinic: { id: string; name: string; city: string; planName: string | null; monthlyPrice: number | null };
  users: { id: string; email: string; role: string; status: string; name: string; lastLoginAt: string | null }[];
  history: { id: string; occurredAt: string; event: string; author: string }[];
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrador", DOCTOR: "Profesional", SECRETARY: "Secretaria" };

export default function ClinicPanel({
  row,
  refreshKey,
  onClose,
  onPick,
  onSaved,
}: {
  row: DashClinicRow;
  refreshKey: number;
  onClose: () => void;
  onPick: (kind: ActionKind) => void;
  onSaved: (message: string) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: row.name, city: row.city, planName: "", monthlyPrice: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api<Detail>(`/api/super-admin/clinics/${encodeURIComponent(row.id)}`);
      setDetail(d);
      setForm({
        name: d.clinic.name,
        city: d.clinic.city,
        planName: d.clinic.planName ?? "",
        monthlyPrice: d.clinic.monthlyPrice === null ? "" : String(d.clinic.monthlyPrice),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el detalle.");
    }
  }, [row.id]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load, refreshKey]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const price = form.monthlyPrice.trim() === "" ? null : Number(form.monthlyPrice);
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      setFormError("El precio debe ser un numero entero en CLP.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/super-admin/clinics/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        json: { name: form.name, city: form.city, planName: form.planName.trim() || null, monthlyPrice: price },
      });
      onSaved(`Datos de ${form.name} actualizados.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const target = {
    id: row.id,
    name: row.name,
    billingStatus: row.billingStatus,
    isActive: row.isActive,
    monthlyPrice: row.monthlyPrice,
  };
  const actions = actionMenu(target, onPick).filter((a) => !a.hidden);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-label={`Detalle de ${row.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-950">{row.name}</h2>
            <p className="text-sm text-slate-500">{row.city}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={statusTone(row.billingStatus)}>{STATUS_LABEL[row.billingStatus]}</Badge>
              {!row.isActive && <Badge tone="rose">Sin acceso</Badge>}
              <Badge tone="slate">{row.plan}</Badge>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Resumen</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Precio mensual", row.monthlyPrice > 0 ? clp(row.monthlyPrice) : "-"],
                ["Paga hoy", row.paying ? "Si" : "No"],
                ["Alta de suscripcion", dateLabel(row.subscriptionStartedAt)],
                ["Fin de prueba", row.billingStatus === "TRIAL" ? dateLabel(row.trialEndsAt) : "-"],
                ["Cancelada el", dateLabel(row.canceledAt)],
                ["Creada el", dateLabel(row.createdAt)],
                ["Pacientes", num(row.patients)],
                ["Citas este mes", num(row.appointmentsMonth)],
                ["Pacientes nuevos (mes)", num(row.newPatientsMonth)],
                ["Usuarios activos", `${row.activeUsers} de ${row.users}`],
                ["Entraron en 30 dias", num(row.activeUsers30d)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Acciones</h3>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className={`${btnGhost} ${a.danger ? "!border-rose-200 !text-rose-600 hover:!bg-rose-50" : ""}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Editar datos comerciales</h3>
            <form onSubmit={save} className="space-y-3">
              <Field label="Nombre">
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={120} />
              </Field>
              <Field label="Ciudad">
                <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required maxLength={80} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan">
                  <input className={inputClass} value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} maxLength={60} placeholder="Starter, Pro..." />
                </Field>
                <Field label="Precio mensual (CLP)">
                  <input className={inputClass} type="number" min={0} step={1} value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} />
                </Field>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Usuarios de la sede</h3>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {!detail && !error && <p className="text-sm text-slate-500">Cargando...</p>}
            {detail && detail.users.length === 0 && <p className="text-sm text-slate-500">Esta sede no tiene usuarios.</p>}
            <ul className="divide-y divide-slate-100 text-sm">
              {detail?.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{u.name || u.email}</p>
                    <p className="truncate text-xs text-slate-500">
                      {u.email} - {ROLE_LABEL[u.role] ?? u.role}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <Badge tone={u.status === "ACTIVE" ? "emerald" : "slate"}>{u.status === "ACTIVE" ? "Activo" : "Inactivo"}</Badge>
                    <p className="mt-1">{u.lastLoginAt ? `Entro ${dateTimeLabel(u.lastLoginAt)}` : "Nunca entro"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Historial de cambios</h3>
            {detail && detail.history.length === 0 && <p className="text-sm text-slate-500">Sin cambios registrados desde este panel.</p>}
            <ul className="space-y-2 text-sm">
              {detail?.history.map((h) => (
                <li key={h.id} className="flex justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-slate-800">{EVENT_LABEL[h.event] ?? h.event}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {dateTimeLabel(h.occurredAt)} - {h.author}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
