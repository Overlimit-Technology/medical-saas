"use client";

import { useState } from "react";
import { api } from "./format";
import { ConfirmDialog, Field, inputClass, type MenuItem } from "./ui";

export type ActionKind =
  | "suspend"
  | "reactivate"
  | "mark_past_due"
  | "mark_paid"
  | "cancel"
  | "extend_trial"
  | "end_trial_convert"
  | "end_trial_cancel";

export type ActionTarget = {
  id: string;
  name: string;
  billingStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  isActive: boolean;
  monthlyPrice: number;
};

// Acciones disponibles segun el estado de la sede (el servidor vuelve a validar cada una).
export function actionMenu(c: ActionTarget, pick: (kind: ActionKind) => void): MenuItem[] {
  return [
    { label: "Suspender acceso", onClick: () => pick("suspend"), danger: true, hidden: !c.isActive },
    { label: "Dar acceso / reactivar", onClick: () => pick("reactivate"), hidden: c.isActive && c.billingStatus !== "CANCELED" },
    { label: "Extender prueba", onClick: () => pick("extend_trial"), hidden: c.billingStatus !== "TRIAL" },
    { label: "Terminar prueba: convertir en suscripcion", onClick: () => pick("end_trial_convert"), hidden: c.billingStatus !== "TRIAL" },
    { label: "Terminar prueba sin conversion", onClick: () => pick("end_trial_cancel"), danger: true, hidden: c.billingStatus !== "TRIAL" },
    { label: "Marcar como morosa", onClick: () => pick("mark_past_due"), hidden: c.billingStatus !== "ACTIVE" },
    { label: "Marcar pago regularizado", onClick: () => pick("mark_paid"), hidden: c.billingStatus !== "PAST_DUE" },
    { label: "Marcar como cancelada", onClick: () => pick("cancel"), danger: true, hidden: c.billingStatus === "CANCELED" },
  ];
}

const COPY: Record<ActionKind, { title: string; confirm: string; danger?: boolean; text: (name: string) => string }> = {
  suspend: {
    title: "Suspender acceso",
    confirm: "Suspender",
    danger: true,
    text: (n) => `${n} quedara sin acceso: sus usuarios no podran operar hasta que la reactives. No se borra ningun dato.`,
  },
  reactivate: {
    title: "Dar acceso a la sede",
    confirm: "Dar acceso",
    text: (n) => `${n} volvera a tener acceso. Si estaba cancelada, vuelve como activa (si tiene precio) o en prueba de 14 dias.`,
  },
  mark_past_due: {
    title: "Marcar como morosa",
    confirm: "Marcar morosa",
    text: (n) => `${n} pasara a pago atrasado. Sigue contando en el MRR pero tambien en el ingreso en riesgo. El acceso no cambia.`,
  },
  mark_paid: {
    title: "Pago regularizado",
    confirm: "Marcar activa",
    text: (n) => `${n} volvera a estado activa.`,
  },
  cancel: {
    title: "Marcar como cancelada",
    confirm: "Cancelar sede",
    danger: true,
    text: (n) => `${n} se registrara como baja (churn) y perdera el acceso. Podras reactivarla despues.`,
  },
  extend_trial: { title: "Extender prueba", confirm: "Extender", text: (n) => `Agrega dias a la prueba de ${n}.` },
  end_trial_convert: {
    title: "Convertir prueba en suscripcion",
    confirm: "Convertir",
    text: (n) => `${n} pasara a activa y empezara a contar en el MRR con su precio mensual.`,
  },
  end_trial_cancel: {
    title: "Terminar prueba sin conversion",
    confirm: "Terminar prueba",
    danger: true,
    text: (n) => `La prueba de ${n} termina hoy, la sede queda cancelada y sin acceso.`,
  },
};

const BODY: Record<ActionKind, (days: number) => Record<string, unknown>> = {
  suspend: () => ({ action: "suspend" }),
  reactivate: () => ({ action: "reactivate" }),
  mark_past_due: () => ({ action: "mark_past_due" }),
  mark_paid: () => ({ action: "mark_paid" }),
  cancel: () => ({ action: "cancel" }),
  extend_trial: (days) => ({ action: "extend_trial", days }),
  end_trial_convert: () => ({ action: "end_trial", outcome: "convert" }),
  end_trial_cancel: () => ({ action: "end_trial", outcome: "cancel" }),
};

export function ActionDialog({
  target,
  kind,
  onClose,
  onDone,
}: {
  target: ActionTarget;
  kind: ActionKind;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const copy = COPY[kind];
  const [days, setDays] = useState(7);

  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      danger={copy.danger}
      message={copy.text(target.name)}
      onClose={onClose}
      onConfirm={async () => {
        await api(`/api/super-admin/clinics/${encodeURIComponent(target.id)}/action`, {
          method: "POST",
          json: BODY[kind](days),
        });
        onDone(`${copy.title}: ${target.name}`);
      }}
    >
      {kind === "extend_trial" && (
        <Field label="Dias a agregar" hint="Entre 1 y 90. Se suman al fin de la prueba vigente (o desde hoy si ya vencio).">
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(90, Math.floor(Number(e.target.value) || 1))))}
            className={inputClass}
          />
        </Field>
      )}
      {kind === "end_trial_convert" && target.monthlyPrice <= 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
          Esta sede no tiene precio mensual. Edita el plan y el precio antes de convertir la prueba.
        </p>
      )}
    </ConfirmDialog>
  );
}
