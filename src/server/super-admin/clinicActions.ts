// Reglas puras de las acciones comerciales sobre una sede (sin base de datos, verificables con pruebas).
import { z } from "zod";

export type CommercialClinic = {
  isActive: boolean;
  billingStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  monthlyPrice: number | null;
  trialEndsAt: Date | null;
  subscriptionStartedAt: Date | null;
};

export const clinicActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reactivate") }),
  z.object({ action: z.literal("mark_past_due") }),
  z.object({ action: z.literal("mark_paid") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("extend_trial"), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal("end_trial"), outcome: z.enum(["convert", "cancel"]) }),
]);
export type ClinicAction = z.infer<typeof clinicActionSchema>;

export type ClinicActionPlan =
  | {
      ok: true;
      data: Partial<{
        isActive: boolean;
        billingStatus: CommercialClinic["billingStatus"];
        trialEndsAt: Date | null;
        subscriptionStartedAt: Date | null;
        canceledAt: Date | null;
      }>;
      event: string;
    }
  | { ok: false; error: string };

const DAY_MS = 86_400_000;
const fail = (error: string): ClinicActionPlan => ({ ok: false, error });

export function planClinicAction(clinic: CommercialClinic, action: ClinicAction, now: Date): ClinicActionPlan {
  const hasPrice = (clinic.monthlyPrice ?? 0) > 0;

  switch (action.action) {
    case "suspend":
      if (!clinic.isActive) return fail("La sede ya esta suspendida.");
      return { ok: true, data: { isActive: false }, event: "SUPERADMIN_CLINIC_SUSPEND" };

    case "reactivate": {
      if (clinic.isActive && clinic.billingStatus !== "CANCELED") return fail("La sede ya tiene acceso.");
      if (clinic.billingStatus === "CANCELED") {
        // Una sede cancelada que vuelve: con precio pasa a activa (nueva suscripcion), sin precio vuelve a prueba.
        return hasPrice
          ? {
              ok: true,
              data: { isActive: true, billingStatus: "ACTIVE", canceledAt: null, subscriptionStartedAt: now, trialEndsAt: null },
              event: "SUPERADMIN_CLINIC_REACTIVATE",
            }
          : {
              ok: true,
              data: {
                isActive: true,
                billingStatus: "TRIAL",
                canceledAt: null,
                subscriptionStartedAt: null,
                trialEndsAt: new Date(now.getTime() + 14 * DAY_MS),
              },
              event: "SUPERADMIN_CLINIC_REACTIVATE",
            };
      }
      return { ok: true, data: { isActive: true }, event: "SUPERADMIN_CLINIC_REACTIVATE" };
    }

    case "mark_past_due":
      if (clinic.billingStatus !== "ACTIVE") return fail("Solo una sede activa puede pasar a morosa.");
      return { ok: true, data: { billingStatus: "PAST_DUE" }, event: "SUPERADMIN_CLINIC_PAST_DUE" };

    case "mark_paid":
      if (clinic.billingStatus !== "PAST_DUE") return fail("La sede no esta morosa.");
      return { ok: true, data: { billingStatus: "ACTIVE" }, event: "SUPERADMIN_CLINIC_PAID" };

    case "cancel":
      if (clinic.billingStatus === "CANCELED") return fail("La sede ya esta cancelada.");
      return {
        ok: true,
        data: { billingStatus: "CANCELED", canceledAt: now, isActive: false },
        event: "SUPERADMIN_CLINIC_CANCEL",
      };

    case "extend_trial": {
      if (clinic.billingStatus !== "TRIAL") return fail("Solo se puede extender la prueba de una sede en prueba.");
      const base = clinic.trialEndsAt && clinic.trialEndsAt.getTime() > now.getTime() ? clinic.trialEndsAt : now;
      return {
        ok: true,
        data: { trialEndsAt: new Date(base.getTime() + action.days * DAY_MS) },
        event: "SUPERADMIN_CLINIC_EXTEND_TRIAL",
      };
    }

    case "end_trial":
      if (clinic.billingStatus !== "TRIAL") return fail("La sede no esta en prueba.");
      if (action.outcome === "cancel") {
        return {
          ok: true,
          data: { billingStatus: "CANCELED", canceledAt: now, isActive: false, trialEndsAt: now },
          event: "SUPERADMIN_CLINIC_END_TRIAL_CANCEL",
        };
      }
      if (!hasPrice) return fail("Define un precio mensual antes de convertir la prueba en suscripcion.");
      return {
        ok: true,
        data: { billingStatus: "ACTIVE", subscriptionStartedAt: now, trialEndsAt: null, isActive: true },
        event: "SUPERADMIN_CLINIC_END_TRIAL_CONVERT",
      };
  }
}
