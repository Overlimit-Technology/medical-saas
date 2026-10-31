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

/** Recuperar la contrasena: RUT o correo, codigo por correo y contrasena nueva. Al terminar el paciente entra. */
export default function PortalRecover({ slug }: { slug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"cuenta" | "codigo">("cuenta");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await post(`/api/portal/${slug}/auth/recuperar`, { identifier });
      setStep("codigo");
      if (!e) setInfo("Te enviamos un código nuevo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el código.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post(`/api/portal/${slug}/auth/restablecer`, { identifier, code, password });
      router.replace(`/portal/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cambiar tu contraseña.");
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
      <form className="auth-card" onSubmit={reset} noValidate>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="tag">
            <MailCheck size={15} />
            Revisa tu correo
          </span>
          <h2>Crea tu contraseña nueva</h2>
          <p className="text">
            Si <b style={{ color: "var(--zs-text)" }}>{identifier}</b> tiene una cuenta, te enviamos un código de 6 números al correo registrado. Vence en 10 minutos.
          </p>
        </div>
        <div className="field">
          <label htmlFor="rc-code">Código</label>
          <input
            className="input code-input"
            id="rc-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="rc-pass">Contraseña nueva</label>
          <input className="input" id="rc-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>Al menos 8 caracteres.</small>
        </div>
        <div className="field">
          <label htmlFor="rc-pass2">Repite la contraseña</label>
          <input className="input" id="rc-pass2" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        {errorLine}
        {info ? <p className="small" role="status">{info}</p> : null}
        <button className="btn block" type="submit" disabled={busy || code.length !== 6 || password.length < 8}>
          {busy ? "Guardando…" : "Guardar e ingresar"} <ArrowRight size={16} className="go" />
        </button>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="link" type="button" onClick={() => setStep("cuenta")}>
            Cambiar RUT o correo
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
        <span className="tag">Recuperar contraseña</span>
        <h2>¿Olvidaste tu contraseña?</h2>
        <p className="text">Escribe tu RUT o tu correo y te enviaremos un código para crear una nueva.</p>
      </div>
      <div className="field">
        <label htmlFor="rc-id">RUT o correo</label>
        <input className="input" id="rc-id" autoComplete="username" placeholder="12.345.678-5 o tu@correo.cl" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </div>
      {errorLine}
      <button className="btn block" type="submit" disabled={busy || !identifier.trim()}>
        {busy ? "Enviando…" : "Enviarme el código"} <ArrowRight size={16} className="go" />
      </button>
      <p className="small" style={{ textAlign: "center" }}>
        ¿La recordaste?{" "}
        <Link className="link" href={`/portal/${slug}/ingresar`}>
          Ingresa aquí
        </Link>
      </p>
    </form>
  );
}
