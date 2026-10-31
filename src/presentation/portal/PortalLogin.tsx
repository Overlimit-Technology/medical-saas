"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function PortalLogin({ slug }: { slug: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${slug}/auth/ingresar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      router.replace(`/portal/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar tu sesión.");
      setBusy(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="tag">Ingresar</span>
        <h2>Hola de nuevo</h2>
        <p className="text">Ingresa con tu RUT o tu correo y tu contraseña.</p>
      </div>
      <div className="field">
        <label htmlFor="lg-id">RUT o correo</label>
        <input className="input" id="lg-id" autoComplete="username" placeholder="12.345.678-5 o tu@correo.cl" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="lg-pass">Contraseña</label>
        <input className="input" id="lg-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Link className="link small" href={`/portal/${slug}/recuperar`} style={{ alignSelf: "flex-end" }}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      {error ? (
        <p className="small" role="alert" style={{ color: "var(--zs-err-text)" }}>
          {error}
        </p>
      ) : null}
      <button className="btn block" type="submit" disabled={busy || !identifier || !password}>
        {busy ? "Ingresando…" : "Ingresar"} <ArrowRight size={16} className="go" />
      </button>
      <p className="small" style={{ textAlign: "center" }}>
        ¿Primera vez?{" "}
        <Link className="link" href={`/portal/${slug}/registro`}>
          Crea tu cuenta
        </Link>
      </p>
    </form>
  );
}
