"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data;
}

/** Registro en dos pasos: datos y codigo por correo. Al validar el codigo la cuenta se crea y el paciente entra. */
export default function PortalSignup({ slug }: { slug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"datos" | "codigo">("datos");
  const [form, setForm] = useState({ run: "", email: "", firstName: "", lastName: "", phone: "" });
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const data = await post(`/api/portal/${slug}/auth/registro`, form);
      setMaskedEmail(data.maskedEmail);
      setStep("codigo");
      if (!e) setInfo("Te enviamos un código nuevo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el código.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post(`/api/portal/${slug}/auth/verificar`, { run: form.run, code, password });
      router.replace(`/portal/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear tu cuenta.");
      setBusy(false);
    }
  };

  const errorLine = error ? (
    <p className="small" role="alert" style={{ color: "var(--zs-err-text)" }}>
      {error}
    </p>
  ) : null;

  if (step === "codigo") {
    return (
      <form className="auth-card" onSubmit={verify} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="tag">
            <MailCheck size={15} />
            Revisa tu correo
          </span>
          <h2>Escribe tu código</h2>
          <p className="text">
            Enviamos un código de 6 números a <b style={{ color: "var(--zs-text)" }}>{maskedEmail}</b>. Vence en 10 minutos.
          </p>
        </div>
        <div className="field">
          <label htmlFor="sg-code">Código</label>
          <input
            className="input code-input"
            id="sg-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="sg-pass">Crea tu contraseña</label>
          <input className="input" id="sg-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>Al menos 8 caracteres.</small>
        </div>
        <div className="field">
          <label htmlFor="sg-pass2">Repite la contraseña</label>
          <input className="input" id="sg-pass2" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        {errorLine}
        {info ? <p className="small" role="status">{info}</p> : null}
        <button className="btn block" type="submit" disabled={busy || code.length !== 6 || password.length < 8}>
          {busy ? "Creando tu cuenta…" : "Crear cuenta e ingresar"} <ArrowRight size={16} className="go" />
        </button>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="link" type="button" onClick={() => setStep("datos")}>
            Cambiar mis datos
          </button>
          <button className="link" type="button" disabled={busy} onClick={() => requestCode()}>
            Reenviar código
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="auth-card" onSubmit={requestCode} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="tag">Crear cuenta</span>
        <h2>Activa tu portal</h2>
        <p className="text">Si ya te atendiste en la clínica, el código llegará al correo de tu ficha. Si eres nuevo, completa tus datos.</p>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="sg-run">RUT</label>
          <input className="input" id="sg-run" placeholder="12.345.678-5" value={form.run} onChange={set("run")} />
        </div>
        <div className="field">
          <label htmlFor="sg-mail">Correo</label>
          <input className="input" id="sg-mail" type="email" autoComplete="email" placeholder="tu@correo.cl" value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label htmlFor="sg-name">Nombre</label>
          <input className="input" id="sg-name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
        </div>
        <div className="field">
          <label htmlFor="sg-last">Apellido</label>
          <input className="input" id="sg-last" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
        </div>
        <div className="field full">
          <label htmlFor="sg-tel">Teléfono (opcional)</label>
          <input className="input" id="sg-tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" value={form.phone} onChange={set("phone")} />
        </div>
      </div>
      {errorLine}
      <button className="btn block" type="submit" disabled={busy || !form.run || !form.email}>
        {busy ? "Enviando…" : "Enviarme el código"} <ArrowRight size={16} className="go" />
      </button>
      <p className="small" style={{ textAlign: "center" }}>
        ¿Ya tienes cuenta?{" "}
        <Link className="link" href={`/portal/${slug}/ingresar`}>
          Ingresa aquí
        </Link>
      </p>
    </form>
  );
}
