"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";

type Patient = {
  fullName: string;
  initials: string;
  run: string;
  email: string;
  birthDate: string | null;
  since: string;
  phone: string;
  address: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type Status = { tone: "ok" | "err"; text: string } | null;

function Message({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p className="small" role={status.tone === "err" ? "alert" : "status"} style={{ color: status.tone === "err" ? "var(--zs-err-text)" : "var(--zs-accent-text)" }}>
      {status.text}
    </p>
  );
}

export default function PortalProfile({ slug, patient }: { slug: string; patient: Patient }) {
  const router = useRouter();
  const [form, setForm] = useState({
    phone: patient.phone,
    address: patient.address,
    city: patient.city,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [pass, setPass] = useState({ current: "", next: "" });
  const [passStatus, setPassStatus] = useState<Status>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/portal/${slug}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setStatus({ tone: "ok", text: "Guardamos tus cambios." });
      router.refresh();
    } catch (err) {
      setStatus({ tone: "err", text: err instanceof Error ? err.message : "No pudimos guardar tus datos." });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);
    try {
      const res = await fetch(`/api/portal/${slug}/contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pass),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPass({ current: "", next: "" });
      setPassStatus({ tone: "ok", text: "Cambiamos tu contraseña." });
    } catch (err) {
      setPassStatus({ tone: "err", text: err instanceof Error ? err.message : "No pudimos cambiar tu contraseña." });
    }
  };

  return (
    <div className="grid g-main">
      <form className="card" onSubmit={save} noValidate>
        <div className="row" style={{ marginBottom: 22, gap: 18 }}>
          <span className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
            {patient.initials}
          </span>
          <div>
            <h2 style={{ font: "700 22px/1.25 var(--zs-font-display)" }}>{patient.fullName}</h2>
            <p className="small">Paciente desde el {patient.since}</p>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pf-run">RUT</label>
            <input className="input" id="pf-run" value={patient.run} readOnly />
          </div>
          <div className="field">
            <label htmlFor="pf-mail">Correo</label>
            <input className="input" id="pf-mail" value={patient.email} readOnly />
            <small>Es el correo de tu cuenta. Para cambiarlo, habla con recepción.</small>
          </div>
          <div className="field">
            <label htmlFor="pf-tel">Teléfono</label>
            <input className="input" id="pf-tel" inputMode="tel" placeholder="+56 9 1234 5678" value={form.phone} onChange={set("phone")} />
          </div>
          <div className="field">
            <label htmlFor="pf-nac">Fecha de nacimiento</label>
            <input className="input" id="pf-nac" value={patient.birthDate ?? "Sin registrar"} readOnly />
          </div>
          <div className="field">
            <label htmlFor="pf-dir">Dirección</label>
            <input className="input" id="pf-dir" value={form.address} onChange={set("address")} />
          </div>
          <div className="field">
            <label htmlFor="pf-city">Comuna o ciudad</label>
            <input className="input" id="pf-city" value={form.city} onChange={set("city")} />
          </div>
          <div className="field">
            <label htmlFor="pf-eme">Contacto de emergencia</label>
            <input className="input" id="pf-eme" placeholder="Nombre y parentesco" value={form.emergencyContactName} onChange={set("emergencyContactName")} />
          </div>
          <div className="field">
            <label htmlFor="pf-emetel">Teléfono de emergencia</label>
            <input className="input" id="pf-emetel" inputMode="tel" placeholder="+56 9 1234 5678" value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 22, justifyContent: "space-between" }}>
          <Message status={status} />
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <form className="card" onSubmit={changePassword} noValidate>
        <div className="card-h">
          <h2>
            <Lock size={18} strokeWidth={1.8} />
            Contraseña
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label htmlFor="pw-cur">Contraseña actual</label>
            <input className="input" id="pw-cur" type="password" autoComplete="current-password" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="pw-new">Nueva contraseña</label>
            <input className="input" id="pw-new" type="password" autoComplete="new-password" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} />
            <small>Al menos 8 caracteres.</small>
          </div>
          <Message status={passStatus} />
          <button className="btn quiet block" type="submit" disabled={!pass.current || pass.next.length < 8}>
            Cambiar contraseña
          </button>
        </div>
      </form>
    </div>
  );
}
