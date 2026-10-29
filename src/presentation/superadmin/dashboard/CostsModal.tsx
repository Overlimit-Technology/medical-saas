"use client";

import { useCallback, useEffect, useState } from "react";
import { api, clp, monthLabel } from "./format";
import { Field, Modal, btnGhost, btnPrimary, inputClass } from "./ui";

type Cost = { id: string; month: string; category: string; description: string | null; amount: number };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CostsModal({ onClose, onChanged }: { onClose: () => void; onChanged: (message: string) => void }) {
  const [items, setItems] = useState<Cost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ month: currentMonth(), category: "", amount: "" });
  const [editing, setEditing] = useState<{ id: string; amount: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Cost[] }>("/api/super-admin/platform-costs");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los costos.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("El monto debe ser un numero igual o mayor que 0.");
      return;
    }
    void run(async () => {
      await api("/api/super-admin/platform-costs", { method: "POST", json: { month: form.month, category: form.category, amount } });
      setForm((f) => ({ ...f, category: "", amount: "" }));
    }, "Costo agregado.");
  };

  return (
    <Modal title="Costos de plataforma" onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-500">
        Son los costos de operar toda la plataforma (infraestructura, IA, correo...). Con ellos se calcula el margen mensual.
      </p>
      <form onSubmit={add} className="grid items-end gap-3 sm:grid-cols-[130px_1fr_130px_auto]">
        <Field label="Mes">
          <input className={inputClass} type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required />
        </Field>
        <Field label="Categoria">
          <input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required maxLength={60} placeholder="Infraestructura, IA..." />
        </Field>
        <Field label="Monto (CLP)">
          <input className={inputClass} type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </Field>
        <button type="submit" className={btnPrimary} disabled={busy}>
          Agregar
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items === null && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">Cargando...</td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">Sin costos registrados en los ultimos 13 meses.</td>
              </tr>
            )}
            {items?.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 capitalize">{monthLabel(c.month, true)}</td>
                <td className="px-3 py-2">{c.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {editing?.id === c.id ? (
                    <input
                      className={`${inputClass} !w-28 text-right`}
                      type="number"
                      min={0}
                      value={editing.amount}
                      onChange={(e) => setEditing({ id: c.id, amount: e.target.value })}
                      aria-label="Nuevo monto"
                    />
                  ) : (
                    clp(c.amount)
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {editing?.id === c.id ? (
                    <>
                      <button
                        type="button"
                        className="mr-2 text-sm font-semibold text-[#0e88ab]"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`/api/super-admin/platform-costs/${encodeURIComponent(c.id)}`, {
                              method: "PATCH",
                              json: { amount: Number(editing.amount) },
                            });
                            setEditing(null);
                          }, "Costo actualizado.")
                        }
                      >
                        Guardar
                      </button>
                      <button type="button" className="text-sm text-slate-500" onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : confirmDelete === c.id ? (
                    <>
                      <span className="mr-2 text-xs text-slate-500">Eliminar este costo?</span>
                      <button
                        type="button"
                        className="mr-2 text-sm font-semibold text-rose-600"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`/api/super-admin/platform-costs/${encodeURIComponent(c.id)}`, { method: "DELETE" });
                            setConfirmDelete(null);
                          }, "Costo eliminado.")
                        }
                      >
                        Si, eliminar
                      </button>
                      <button type="button" className="text-sm text-slate-500" onClick={() => setConfirmDelete(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="mr-3 text-sm font-semibold text-[#0e88ab]" onClick={() => setEditing({ id: c.id, amount: String(c.amount) })}>
                        Editar
                      </button>
                      <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => setConfirmDelete(c.id)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
