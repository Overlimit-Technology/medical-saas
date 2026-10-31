import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PortalError, resolvePortalClinic, type PortalClinic } from "./PortalAuthService";
import { readPortalSession } from "./portalSession";

// Horas antes de la cita en que el paciente todavia puede cancelar o confirmar desde el portal.
export const CANCEL_MIN_HOURS = 24;

export type PortalPatient = {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  run: string;
  email: string;
  phone: string | null;
  birthDate: Date | null;
  address: string | null;
  city: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: Date;
};

export type PortalContext = { clinic: PortalClinic; patient: PortalPatient };

async function loadContext(slug: string): Promise<PortalContext | "no-clinic" | "no-session"> {
  const clinic = await resolvePortalClinic(slug);
  if (!clinic) return "no-clinic";
  const session = await readPortalSession();
  if (!session || session.clinicId !== clinic.clinicId) return "no-session";

  const patient = await prisma.patient.findFirst({
    where: { id: session.patientId, clinicId: clinic.clinicId, isActive: true, portalAccount: { id: session.accountId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      secondLastName: true,
      run: true,
      phone: true,
      birthDate: true,
      address: true,
      city: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      createdAt: true,
      portalAccount: { select: { id: true, email: true } },
    },
  });
  if (!patient?.portalAccount) return "no-session";

  const { portalAccount, ...rest } = patient;
  return { clinic, patient: { ...rest, accountId: portalAccount.id, email: portalAccount.email } };
}

/** Para paginas: 404 si el portal no existe, al ingreso si no hay sesion valida. */
export async function requirePortalPage(slug: string): Promise<PortalContext> {
  const ctx = await loadContext(slug);
  if (ctx === "no-clinic") notFound();
  if (ctx === "no-session") redirect(`/portal/${slug}/ingresar`);
  return ctx;
}

/** Para rutas de API: lanza PortalError (401/404) en vez de redirigir. */
export async function requirePortalApi(slug: string): Promise<PortalContext> {
  const ctx = await loadContext(slug);
  if (ctx === "no-clinic") throw new PortalError("El portal no esta disponible.");
  if (ctx === "no-session") throw new PortalError("Tu sesion termino. Vuelve a ingresar.");
  return ctx;
}

const doctorSelect = {
  profile: { select: { firstName: true, lastName: true } },
  doctorProfile: { select: { specialty: true, profession: { select: { name: true } } } },
} as const;

type DoctorRow = {
  profile: { firstName: string; lastName: string } | null;
  doctorProfile: { specialty: string | null; profession: { name: string } | null } | null;
};

function doctorName(doctor: DoctorRow) {
  return `${doctor.profile?.firstName ?? ""} ${doctor.profile?.lastName ?? ""}`.trim() || "Profesional";
}

function doctorSpecialty(doctor: DoctorRow) {
  return (
    [doctor.doctorProfile?.profession?.name, doctor.doctorProfile?.specialty?.trim()]
      .filter((part, index, all) => part && all.indexOf(part) === index)
      .join(" · ") || "Atencion general"
  );
}

export type PortalAppointment = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentStatus: "PENDING" | "PAID" | "WAIVED";
  doctorName: string;
  specialty: string;
  boxName: string;
  planName: string | null;
  sessionIndex: number | null;
  canChange: boolean;
};

export class PortalService {
  /** Contadores del menu: citas por confirmar y pagos pendientes. */
  static async badges(ctx: PortalContext) {
    const [pendingAppointments, pendingPayments] = await Promise.all([
      prisma.appointment.count({
        where: { clinicId: ctx.clinic.clinicId, patientId: ctx.patient.id, status: "SCHEDULED", startAt: { gt: new Date() } },
      }),
      prisma.paymentHistory.count({ where: { status: "PENDING", patientTreatment: { patientId: ctx.patient.id } } }),
    ]);
    return { pendingAppointments, pendingPayments };
  }

  static async appointments(ctx: PortalContext): Promise<PortalAppointment[]> {
    const rows = await prisma.appointment.findMany({
      where: { clinicId: ctx.clinic.clinicId, patientId: ctx.patient.id },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        paymentStatus: true,
        planSessionIndex: true,
        box: { select: { name: true } },
        treatmentPlan: { select: { name: true } },
        doctor: { select: doctorSelect },
      },
    });
    const limit = Date.now() + CANCEL_MIN_HOURS * 3600_000;
    return rows.map((row) => ({
      id: row.id,
      startAt: row.startAt,
      endAt: row.endAt,
      status: row.status,
      paymentStatus: row.paymentStatus,
      doctorName: doctorName(row.doctor),
      specialty: doctorSpecialty(row.doctor),
      boxName: row.box.name,
      planName: row.treatmentPlan?.name ?? null,
      sessionIndex: row.planSessionIndex,
      canChange: (row.status === "SCHEDULED" || row.status === "CONFIRMED") && row.startAt.getTime() > limit,
    }));
  }

  /** Confirma o cancela una cita propia. Solo citas futuras y con al menos CANCEL_MIN_HOURS de anticipacion. */
  static async changeAppointment(ctx: PortalContext, appointmentId: string, action: "confirm" | "cancel") {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId: ctx.clinic.clinicId, patientId: ctx.patient.id },
      select: { id: true, status: true, startAt: true },
    });
    if (!appointment) throw new PortalError("No encontramos esa cita.");
    if (appointment.status !== "SCHEDULED" && appointment.status !== "CONFIRMED") {
      throw new PortalError("Esta cita ya no se puede modificar.");
    }
    if (appointment.startAt.getTime() <= Date.now() + CANCEL_MIN_HOURS * 3600_000) {
      throw new PortalError(`Faltan menos de ${CANCEL_MIN_HOURS} horas. Llama a la clinica para cambiarla.`);
    }
    if (action === "confirm" && appointment.status === "CONFIRMED") return;

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: action === "confirm" ? "CONFIRMED" : "CANCELLED" },
    });
  }

  static async plans(ctx: PortalContext) {
    const plans = await prisma.treatmentPlan.findMany({
      where: { clinicId: ctx.clinic.clinicId, patientId: ctx.patient.id },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      select: {
        id: true,
        name: true,
        notes: true,
        status: true,
        startsAt: true,
        endsAt: true,
        treatments: { orderBy: { position: "asc" }, select: { treatment: { select: { name: true } } } },
        appointments: {
          orderBy: { startAt: "asc" },
          select: { id: true, status: true, startAt: true, planSessionIndex: true, doctor: { select: doctorSelect } },
        },
      },
    });
    return plans.map((plan) => {
      const sessions = plan.appointments.filter((a) => a.status !== "CANCELLED");
      const next = sessions.find((a) => (a.status === "SCHEDULED" || a.status === "CONFIRMED") && a.startAt > new Date());
      return {
        id: plan.id,
        name: plan.name,
        notes: plan.notes,
        status: plan.status,
        startsAt: plan.startsAt,
        endsAt: plan.endsAt,
        treatments: plan.treatments.map((t) => t.treatment.name),
        total: sessions.length,
        done: sessions.filter((a) => a.status === "COMPLETED").length,
        missed: sessions.filter((a) => a.status === "NO_SHOW").length,
        next: next ? { startAt: next.startAt, doctorName: doctorName(next.doctor) } : null,
        professional: sessions[0] ? doctorName(sessions[0].doctor) : null,
      };
    });
  }

  static async payments(ctx: PortalContext) {
    const rows = await prisma.paymentHistory.findMany({
      where: { patientTreatment: { patientId: ctx.patient.id } },
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        status: true,
        amount: true,
        recordedAt: true,
        notes: true,
        patientTreatment: { select: { treatment: { select: { name: true } } } },
        appointment: { select: { startAt: true, clinicId: true } },
      },
    });
    return rows
      .filter((row) => !row.appointment || row.appointment.clinicId === ctx.clinic.clinicId)
      .map((row) => ({
        id: row.id,
        status: row.status,
        amount: Number(row.amount),
        date: row.appointment?.startAt ?? row.recordedAt,
        concept: row.patientTreatment.treatment.name,
      }));
  }

  static async documents(ctx: PortalContext) {
    return prisma.patientImaging.findMany({
      where: { clinicId: ctx.clinic.clinicId, patientId: ctx.patient.id },
      orderBy: { studiedAt: "desc" },
      select: { id: true, studyName: true, doctorName: true, status: true, imageUrl: true, observation: true, studiedAt: true },
    });
  }

  static async updateProfile(
    ctx: PortalContext,
    data: { phone: string; address: string; city: string; emergencyContactName: string; emergencyContactPhone: string }
  ) {
    await prisma.patient.update({
      where: { id: ctx.patient.id },
      data: {
        phone: data.phone.trim() || null,
        address: data.address.trim() || null,
        city: data.city.trim() || null,
        emergencyContactName: data.emergencyContactName.trim() || null,
        emergencyContactPhone: data.emergencyContactPhone.trim() || null,
      },
    });
  }
}
