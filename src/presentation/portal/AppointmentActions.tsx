"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Phone } from "lucide-react";

type Props = { slug: string; id: string; status: string; canChange: boolean; compact?: boolean };

/** Confirmar o cancelar una cita propia. La cancelacion pide una segunda confirmacion en la misma tarjeta. */
export default function AppointmentActions({ slug, id, status, canChange, compact }: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canChange) {
    if (status !== "SCHEDULED" && status !== "CONFIRMED") return null;
    return (
      <p className="small" style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Phone size={15} strokeWidth={1.8} />
        Faltan menos de 24 horas: para cambiarla, llama a la clínica.
      </p>
    );
  }

  const send = async (action: "confirm" | "cancel") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${slug}/citas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setAsking(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar tu cita.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {asking ? (
        <div className="notice err" style={{ marginTop: 14, flexDirection: "column" }}>
          <span>¿Cancelar esta cita? Liberaremos la hora para otro paciente.</span>
          <div className="row">
            <button className="btn danger sm" type="button" disabled={busy} onClick={() => send("cancel")}>
              Sí, cancelar
            </button>
            <button className="btn quiet sm" type="button" disabled={busy} onClick={() => setAsking(false)}>
              Mantener mi cita
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {status === "SCHEDULED" ? (
            <button className="btn sm" type="button" disabled={busy} onClick={() => send("confirm")}>
              <Check size={16} strokeWidth={2} />
              Confirmar asistencia
            </button>
          ) : null}
          {!compact ? (
            <button className="btn danger sm" type="button" disabled={busy} onClick={() => setAsking(true)}>
              Cancelar
            </button>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="small" style={{ color: "var(--zs-err-text)", marginTop: 8 }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
