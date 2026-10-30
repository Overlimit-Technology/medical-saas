"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { api } from "./format";
import { Field, Modal, btnGhost, btnPrimary, inputClass } from "./ui";

type Created = { clinic: { id: string; name: string }; admin: { email: string }; temporaryPassword: string };

export default function CreateClinicModal({
  plans,
  onClose,
  onCreated,
}: {
  plans: string[];
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    planName: "",
    monthlyPrice: "",
    billingStatus: "TRIAL" as "TRIAL" | "ACTIVE",
    trialDays: "14",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const price = form.monthlyPrice.trim() === "" ? null : Number(form.monthlyPrice);
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      setError("El precio debe ser un numero entero en CLP.");
      return;
    }
    if (form.billingStatus === "ACTIVE" && !(price && price > 0)) {
      setError("Una sede activa necesita precio mensual.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<Created>("/api/super-admin/clinics", {
        method: "POST",
        json: {
          name: form.name,
          city: form.city,
          planName: form.planName.trim() || null,
          monthlyPrice: price,
          billingStatus: form.billingStatus,
          trialDays: Number(form.trialDays) || 14,
          admin: { email: form.email, firstName: form.firstName, lastName: form.lastName },
        },
      });
      setCreated(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sede.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (created) onCreated(`Sede ${created.clinic.name} creada.`);
    onClose();
  };

  if (created) {
    return (
      <Modal title="Sede creada" onClose={finish}>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Se creo <b className="text-slate-900">{created.clinic.name}</b> con el administrador{" "}
            <b className="text-slate-900">{created.admin.email}</b>.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="font-medium text-amber-900">Clave temporal (se muestra una sola vez)</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base text-slate-900 select-all">{created.temporaryPassword}</code>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  void navigator.clipboard?.writeText(created.temporaryPassword).then(() => setCopied(true));
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiada" : "Copiar"}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              No se envio por correo. Entregala por un canal seguro: el usuario debera cambiarla al entrar por primera vez.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className={btnPrimary} onClick={finish}>
            Listo
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nueva sede / cliente" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre de la sede">
            <input className={inputClass} value={form.name} onChange={set("name")} required minLength={2} maxLength={120} />
          </Field>
          <Field label="Ciudad">
            <input className={inputClass} value={form.city} onChange={set("city")} required maxLength={80} />
          </Field>
          <Field label="Plan">
            <input className={inputClass} value={form.planName} onChange={set("planName")} list="plan-options" maxLength={60} placeholder="Starter, Pro..." />
            <datalist id="plan-options">
              {plans.filter((p) => p !== "Sin plan").map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Precio mensual (CLP)">
            <input className={inputClass} type="number" min={0} step={1} value={form.monthlyPrice} onChange={set("monthlyPrice")} />
          </Field>
          <Field label="Estado comercial inicial">
            <select className={inputClass} value={form.billingStatus} onChange={set("billingStatus")}>
              <option value="TRIAL">En prueba</option>
              <option value="ACTIVE">Activa (empieza a pagar hoy)</option>
            </select>
          </Field>
          {form.billingStatus === "TRIAL" && (
            <Field label="Dias de prueba" hint="Entre 1 y 90.">
              <input className={inputClass} type="number" min={1} max={90} value={form.trialDays} onChange={set("trialDays")} />
            </Field>
          )}
        </div>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-800">Primer usuario administrador</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input className={inputClass} value={form.firstName} onChange={set("firstName")} required maxLength={80} />
            </Field>
            <Field label="Apellido">
              <input className={inputClass} value={form.lastName} onChange={set("lastName")} required maxLength={80} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Correo" hint="Se genera una clave temporal que el usuario debe cambiar al entrar.">
                <input className={inputClass} type="email" value={form.email} onChange={set("email")} required maxLength={160} />
              </Field>
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Creando..." : "Crear sede"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
