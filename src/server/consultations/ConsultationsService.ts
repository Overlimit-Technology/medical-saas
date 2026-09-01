import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";
import { TreatmentPlansService } from "@/server/treatment-plans/TreatmentPlansService";
import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationHistory,
  ConsultationSectionKey,
  ConsultationVitalKey,
  ConsultationVitalReading,
  ConsultationVisit,
} from "@/domain/consultations/entities/Consultation";
import {
  CONSULTATION_SECTIONS,
  CONSULTATION_SECTION_SYSTEM,
  CONSULTATION_VITALS,
  ENCOUNTER_OUTCOME_CODE,
  ENCOUNTER_OUTCOME_LABEL,
  LOINC_SYSTEM,
  OBSERVATION_CATEGORY_SYSTEM,
  VITAL_SIGNS_CATEGORY,
  isConsultationSectionKey,
  isConsultationVitalKey,
  sectionKeyFromCode,
  vitalKeyFromCode,
} from "@/domain/consultations/entities/ConsultationCodes";

const SECTION_TEXT_MAX = 8000;

/** Cuantas consultas previas se traen para la linea de tiempo lateral. */
const TIMELINE_SIZE = 8;

/**
 * Filas de Observation a revisar para reconstruir el ultimo valor de cada signo
 * vital. Con ~10 codigos por consulta, esto cubre alrededor de una decena de
 * atenciones anteriores, mas que suficiente para la comparativa que se muestra.
 */
const VITALS_LOOKBACK_ROWS = 160;

type ServiceScope = {
  clinicId: string;
  /** Presente solo cuando el rol es DOCTOR: acota la cita a las suyas. */
  doctorId?: string | null;
};

type ResolvedAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: true;
    doctor: { include: { profile: true } };
    box: true;
    treatmentPlan: { select: { id: true; name: true; _count: { select: { appointments: true } } } };
    paymentHistory: {
      include: { patientTreatment: { include: { treatment: true } } };
    };
  };
}>;

const appointmentInclude = {
  patient: true,
  doctor: { include: { profile: true } },
  box: true,
  treatmentPlan: {
    select: { id: true, name: true, _count: { select: { appointments: true } } },
  },
  paymentHistory: {
    include: { patientTreatment: { include: { treatment: true } } },
  },
} satisfies Prisma.AppointmentInclude;

function toNumber(value: { toString(): string } | number) {
  return Number(typeof value === "number" ? value : value.toString());
}

function fullName(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").trim();
}

function ageFromBirthDate(birthDate: Date | null) {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

function doctorLabel(doctor: {
  email?: string | null;
  profile?: { firstName: string | null; lastName: string | null } | null;
}) {
  return (
    fullName([doctor.profile?.firstName, doctor.profile?.lastName]) || doctor.email || "Profesional"
  );
}

/** Recorta y normaliza un texto de seccion; "" significa borrar la seccion. */
function normalizeSectionValue(value: string) {
  return value.trim().slice(0, SECTION_TEXT_MAX);
}

/**
 * Convierte el texto del formulario a numero, respetando coma decimal y el
 * rango de captura del signo vital. Un valor fuera de rango se descarta en vez
 * de guardarse mal: la UI ya avisa antes de llegar aca.
 */
function parseVitalValue(key: ConsultationVitalKey, raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const meta = CONSULTATION_VITALS[key];
  if (value < meta.min || value > meta.max) return null;

  return Number(value.toFixed(meta.decimals));
}

export class ConsultationsService {
  // ---------------------------------------------------------------- lectura

  /** Todo lo que la consola necesita para abrirse, en una sola ida al servidor. */
  static async bootstrap(
    scope: ServiceScope & { appointmentId: string }
  ): Promise<ConsultationBootstrap> {
    const appointment = await this.resolveAppointment(scope);
    const patientId = appointment.patientId;
    const visit = await this.findOpenVisit(scope.clinicId, appointment.id);

    const [draft, history, treatments, boxes] = await Promise.all([
      visit
        ? this.readDraft(visit.id)
        : Promise.resolve<ConsultationDraft>({ sections: {}, vitals: {} }),
      this.buildHistory({
        clinicId: scope.clinicId,
        patientId,
        appointmentId: appointment.id,
        currentVisitId: visit?.id ?? null,
      }),
      prisma.treatment.findMany({ orderBy: { name: "asc" } }),
      prisma.box.findMany({
        where: { clinicId: scope.clinicId, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    // Alergias y farmacos se arrastran solo si hoy todavia no se escribio nada:
    // el profesional siempre puede sobrescribirlos.
    if (!draft.sections.allergies && history.carriedAllergies) {
      draft.sections.allergies = history.carriedAllergies;
    }
    if (!draft.sections.currentMedication && history.carriedMedication) {
      draft.sections.currentMedication = history.carriedMedication;
    }

    return {
      appointment: this.serializeAppointment(appointment),
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        secondLastName: appointment.patient.secondLastName,
        fullName: fullName([
          appointment.patient.firstName,
          appointment.patient.lastName,
          appointment.patient.secondLastName,
        ]),
        run: appointment.patient.run,
        birthDate: appointment.patient.birthDate?.toISOString() ?? null,
        age: ageFromBirthDate(appointment.patient.birthDate),
        gender: appointment.patient.gender,
        email: appointment.patient.email,
        phone: appointment.patient.phone,
        address: appointment.patient.address,
        city: appointment.patient.city,
        emergencyContactName: appointment.patient.emergencyContactName,
        emergencyContactPhone: appointment.patient.emergencyContactPhone,
      },
      visit: visit
        ? { id: visit.id, startedAt: visit.startedAt.toISOString(), isClosed: false }
        : null,
      draft,
      history,
      catalog: {
        treatments: treatments.map((item) => ({
          id: item.id,
          name: item.name,
          price: toNumber(item.price),
        })),
        boxes,
      },
    };
  }

  // --------------------------------------------------------------- escritura

  /** Abre el encuentro, o devuelve el ya abierto si el profesional vuelve a entrar. */
  static async start(
    scope: ServiceScope & { appointmentId: string; doctorId: string; authorId: string }
  ): Promise<ConsultationVisit> {
    const appointment = await this.resolveAppointment(scope);

    if (appointment.status === "CANCELLED") {
      throw new Error("La cita esta cancelada: no se puede iniciar la consulta.");
    }

    const existing = await this.findOpenVisit(scope.clinicId, appointment.id);
    if (existing) {
      return { id: existing.id, startedAt: existing.startedAt.toISOString(), isClosed: false };
    }

    const visit = await prisma.clinicalVisit.create({
      data: {
        clinicId: scope.clinicId,
        patientId: appointment.patientId,
        doctorId: scope.doctorId,
        appointmentId: appointment.id,
      },
      select: { id: true, startedAt: true },
    });

    // Confirmar la cita al abrirla evita que quede como SCHEDULED cuando el
    // paciente ya esta sentado al frente.
    if (appointment.status === "SCHEDULED") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CONFIRMED" },
      });
    }

    await AuditService.log(
      "consultation.start",
      scope.authorId,
      `appointment=${appointment.id}; visit=${visit.id}; patient=${appointment.patientId}`
    );

    return { id: visit.id, startedAt: visit.startedAt.toISOString(), isClosed: false };
  }

  /** Guarda el borrador. Idempotente: reemplaza el valor de cada clave enviada. */
  static async saveDraft(
    scope: ServiceScope & { appointmentId: string; doctorId: string; draft: ConsultationDraft }
  ): Promise<{ savedAt: string }> {
    const appointment = await this.resolveAppointment(scope);
    const visit = await this.findOpenVisit(scope.clinicId, appointment.id);

    if (!visit) {
      throw new Error("La consulta no esta iniciada.");
    }

    await this.persistDraft({
      clinicId: scope.clinicId,
      patientId: appointment.patientId,
      doctorId: visit.doctorId,
      visitId: visit.id,
      draft: scope.draft,
    });

    return { savedAt: new Date().toISOString() };
  }

  /** Cierra la consulta y ejecuta lo acordado: control, plan y cobro. */
  static async close(
    scope: ServiceScope & {
      appointmentId: string;
      doctorId: string;
      authorId: string;
      input: ConsultationClosureInput;
    }
  ): Promise<ConsultationClosureResult> {
    const appointment = await this.resolveAppointment(scope);
    const visit = await this.findOpenVisit(scope.clinicId, appointment.id);

    if (!visit) {
      throw new Error("La consulta no esta iniciada.");
    }

    const { input } = scope;
    const warnings: string[] = [];

    // Una ausencia no agenda control ni cobra: la UI ya lo oculta, pero la
    // regla vive aca para que la API sea coherente por si misma.
    const isNoShow = input.outcome === "NO_SHOW";
    const followUpRequest = isNoShow ? null : input.followUp;
    const chargeRequest = isNoShow ? null : input.charge;

    // El borrador se guarda primero para que nada de lo escrito se pierda si
    // una de las acciones posteriores falla.
    await this.persistDraft({
      clinicId: scope.clinicId,
      patientId: appointment.patientId,
      doctorId: visit.doctorId,
      visitId: visit.id,
      draft: input.draft,
    });

    // El control y el cobro van antes del cierre porque son los que pueden
    // fallar (choque de agenda, tratamiento inexistente). Si algo revienta, la
    // cita sigue abierta y el profesional puede corregir sin perder trabajo.
    let followUpAppointmentId: string | null = null;
    let createdPlanId: string | null = null;

    if (followUpRequest) {
      const startAt = new Date(followUpRequest.startAt);
      if (Number.isNaN(startAt.valueOf())) {
        throw new Error("La fecha del proximo control es invalida.");
      }
      if (startAt.getTime() <= Date.now()) {
        throw new Error("El proximo control debe quedar en el futuro.");
      }

      const durationMinutes = Math.max(5, Math.min(480, followUpRequest.durationMinutes));
      const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

      if (followUpRequest.mode === "single") {
        const created = await AppointmentsService.create({
          clinicId: scope.clinicId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          boxId: followUpRequest.boxId || appointment.boxId,
          startAt,
          endAt,
          status: "SCHEDULED",
          paymentStatus: "PENDING",
          notes: followUpRequest.notes ?? null,
          createdBy: scope.authorId,
        });
        followUpAppointmentId = created.id;
      } else {
        const plan = await TreatmentPlansService.createContinuous({
          clinicId: scope.clinicId,
          patientId: appointment.patientId,
          createdBy: scope.authorId,
          name: followUpRequest.name,
          notes: followUpRequest.notes ?? null,
          treatmentIds: followUpRequest.treatmentIds,
          doctorId: appointment.doctorId,
          boxId: followUpRequest.boxId || appointment.boxId,
          firstSessionStartAt: startAt,
          firstSessionEndAt: endAt,
          totalSessions: followUpRequest.totalSessions,
          frequencyDays: followUpRequest.frequencyDays,
          appointmentNotes: followUpRequest.notes ?? null,
        });
        createdPlanId = plan.id;
        followUpAppointmentId = plan.appointments[0]?.id ?? null;
      }
    }

    let chargeRegistered = false;
    if (chargeRequest) {
      await AppointmentsService.updatePayment(appointment.id, {
        clinicId: scope.clinicId,
        treatmentId: chargeRequest.treatmentId,
        status: chargeRequest.status,
        amount: chargeRequest.amount,
        notes: chargeRequest.notes ?? null,
        performedAt: appointment.startAt,
      });
      chargeRegistered = true;
    }

    const closedAt = new Date();
    const nextStatus = input.outcome === "NO_SHOW" ? "NO_SHOW" : "COMPLETED";

    if (nextStatus === "COMPLETED") {
      if (!input.draft.sections?.diagnosis?.trim()) {
        warnings.push("La atencion quedo cerrada sin diagnostico registrado.");
      }
      if (chargeRequest?.status === "PENDING") {
        warnings.push("El cobro quedo pendiente y no suma a la caja del dia.");
      }
    }

    await prisma.$transaction([
      // Todo lo capturado deja de ser borrador y pasa a ser registro clinico.
      prisma.observation.updateMany({
        where: { clinicalVisitId: visit.id, status: "PRELIMINARY" },
        data: { status: "FINAL", issuedAt: closedAt },
      }),
      // Marca de cierre. Ademas de dejar constancia del desenlace, garantiza
      // que el encuentro tenga una observacion FINAL aunque no se haya escrito
      // nada: es lo que permite distinguir una consulta cerrada de una abierta.
      prisma.observation.create({
        data: {
          clinicId: scope.clinicId,
          patientId: appointment.patientId,
          doctorId: visit.doctorId,
          clinicalVisitId: visit.id,
          status: "FINAL",
          code: ENCOUNTER_OUTCOME_CODE,
          codeSystem: CONSULTATION_SECTION_SYSTEM,
          codeDisplay: ENCOUNTER_OUTCOME_LABEL,
          categoryCode: "exam",
          categorySystem: OBSERVATION_CATEGORY_SYSTEM,
          categoryDisplay: "Exam",
          valueType: "STRING",
          valueString: nextStatus,
          effectiveAt: closedAt,
          issuedAt: closedAt,
        },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: nextStatus },
      }),
    ]);

    await AuditService.log(
      "consultation.close",
      scope.authorId,
      [
        `appointment=${appointment.id}`,
        `visit=${visit.id}`,
        `outcome=${nextStatus}`,
        `followUp=${followUpAppointmentId ?? "none"}`,
        `plan=${createdPlanId ?? "none"}`,
        `charge=${chargeRegistered ? "yes" : "no"}`,
      ].join("; ")
    );

    return {
      appointmentStatus: nextStatus,
      closedAt: closedAt.toISOString(),
      followUpAppointmentId,
      createdPlanId,
      chargeRegistered,
      warnings,
    };
  }

  // ----------------------------------------------------------------- helpers

  private static async resolveAppointment(
    scope: ServiceScope & { appointmentId: string }
  ): Promise<ResolvedAppointment> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: scope.appointmentId,
        clinicId: scope.clinicId,
        doctorId: scope.doctorId ?? undefined,
      },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new Error("Cita no encontrada.");
    }

    return appointment;
  }

  /**
   * Encuentro abierto de una cita: el ultimo que todavia conserva datos en
   * borrador, o el ultimo creado si aun no se escribio nada. Un encuentro sin
   * observaciones PRELIMINARY y con al menos una FINAL se considera cerrado.
   */
  private static async findOpenVisit(clinicId: string, appointmentId: string) {
    const visits = await prisma.clinicalVisit.findMany({
      where: { clinicId, appointmentId },
      orderBy: { startedAt: "desc" },
      select: { id: true, doctorId: true, startedAt: true },
    });

    if (visits.length === 0) return null;

    const finalizedIds = await prisma.observation.findMany({
      where: {
        clinicalVisitId: { in: visits.map((visit) => visit.id) },
        status: { not: "PRELIMINARY" },
      },
      select: { clinicalVisitId: true },
      distinct: ["clinicalVisitId"],
    });

    const closed = new Set(finalizedIds.map((row) => row.clinicalVisitId));
    return visits.find((visit) => !closed.has(visit.id)) ?? null;
  }

  private static async readDraft(visitId: string): Promise<ConsultationDraft> {
    const rows = await prisma.observation.findMany({
      where: { clinicalVisitId: visitId, status: "PRELIMINARY" },
      select: { code: true, codeSystem: true, valueString: true, valueQuantity: true },
    });

    const draft: ConsultationDraft = { sections: {}, vitals: {} };

    for (const row of rows) {
      if (row.codeSystem === CONSULTATION_SECTION_SYSTEM) {
        const key = sectionKeyFromCode(row.code);
        if (key && row.valueString) draft.sections[key] = row.valueString;
        continue;
      }

      const vitalKey = vitalKeyFromCode(row.code);
      if (vitalKey && row.valueQuantity !== null) {
        draft.vitals[vitalKey] = String(row.valueQuantity);
      }
    }

    return draft;
  }

  /**
   * Reemplaza el borrador del encuentro. Solo se tocan las claves enviadas, de
   * modo que guardar una etapa no borra lo escrito en otra.
   */
  private static async persistDraft(params: {
    clinicId: string;
    patientId: string;
    doctorId: string;
    visitId: string;
    draft: ConsultationDraft;
  }) {
    const now = new Date();
    const touchedCodes: string[] = [];
    const rows: Prisma.ObservationCreateManyInput[] = [];

    for (const [rawKey, rawValue] of Object.entries(params.draft.sections ?? {})) {
      if (!isConsultationSectionKey(rawKey)) continue;
      const meta = CONSULTATION_SECTIONS[rawKey];
      touchedCodes.push(meta.code);

      const value = normalizeSectionValue(rawValue ?? "");
      if (!value) continue;

      rows.push({
        clinicId: params.clinicId,
        patientId: params.patientId,
        doctorId: params.doctorId,
        clinicalVisitId: params.visitId,
        status: "PRELIMINARY",
        code: meta.code,
        codeSystem: CONSULTATION_SECTION_SYSTEM,
        codeDisplay: meta.label,
        categoryCode: "exam",
        categorySystem: OBSERVATION_CATEGORY_SYSTEM,
        categoryDisplay: "Exam",
        valueType: "STRING",
        valueString: value,
        effectiveAt: now,
        issuedAt: now,
      });
    }

    for (const [rawKey, rawValue] of Object.entries(params.draft.vitals ?? {})) {
      if (!isConsultationVitalKey(rawKey)) continue;
      const meta = CONSULTATION_VITALS[rawKey];
      touchedCodes.push(meta.code);

      const value = parseVitalValue(rawKey, rawValue ?? "");
      if (value === null) continue;

      rows.push({
        clinicId: params.clinicId,
        patientId: params.patientId,
        doctorId: params.doctorId,
        clinicalVisitId: params.visitId,
        status: "PRELIMINARY",
        code: meta.code,
        codeSystem: LOINC_SYSTEM,
        codeDisplay: meta.label,
        categoryCode: VITAL_SIGNS_CATEGORY,
        categorySystem: OBSERVATION_CATEGORY_SYSTEM,
        categoryDisplay: "Vital Signs",
        valueType: "QUANTITY",
        valueQuantity: value,
        valueUnit: meta.unit,
        effectiveAt: now,
        issuedAt: now,
      });
    }

    if (touchedCodes.length === 0) return;

    await prisma.$transaction([
      prisma.observation.deleteMany({
        where: {
          clinicalVisitId: params.visitId,
          status: "PRELIMINARY",
          code: { in: touchedCodes },
        },
      }),
      ...(rows.length > 0 ? [prisma.observation.createMany({ data: rows })] : []),
    ]);
  }

  private static serializeAppointment(appointment: ResolvedAppointment) {
    const payment = appointment.paymentHistory;

    return {
      id: appointment.id,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      notes: appointment.notes,
      arrivedAt: appointment.arrivedAt?.toISOString() ?? null,
      delayMinutes: appointment.delayMinutes,
      doctorId: appointment.doctorId,
      doctorName: doctorLabel(appointment.doctor),
      boxId: appointment.boxId,
      boxName: appointment.box.name,
      treatmentPlan: appointment.treatmentPlan
        ? {
            id: appointment.treatmentPlan.id,
            name: appointment.treatmentPlan.name,
            sessionIndex: appointment.planSessionIndex,
            totalSessions: appointment.treatmentPlan._count.appointments,
          }
        : null,
      paymentEntry: payment
        ? {
            id: payment.id,
            status: payment.status,
            amount: toNumber(payment.amount),
            notes: payment.notes,
            treatment: {
              id: payment.patientTreatment.treatment.id,
              name: payment.patientTreatment.treatment.name,
              price: toNumber(payment.patientTreatment.treatment.price),
            },
          }
        : null,
    };
  }

  private static async buildHistory(params: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    currentVisitId: string | null;
  }): Promise<ConsultationHistory> {
    const { clinicId, patientId, currentVisitId } = params;
    const sectionCodes = [
      CONSULTATION_SECTIONS.chiefComplaint.code,
      CONSULTATION_SECTIONS.diagnosis.code,
      CONSULTATION_SECTIONS.indications.code,
    ];

    const [
      previousVisits,
      vitalRows,
      carriedRows,
      plans,
      patientTreatments,
      records,
      totalVisits,
      upcoming,
    ] = await Promise.all([
      prisma.clinicalVisit.findMany({
        where: {
          clinicId,
          patientId,
          ...(currentVisitId ? { id: { not: currentVisitId } } : {}),
        },
        orderBy: { startedAt: "desc" },
        take: TIMELINE_SIZE,
        select: {
          id: true,
          startedAt: true,
          appointmentId: true,
          doctor: { select: { email: true, profile: true } },
          observations: {
            where: { codeSystem: CONSULTATION_SECTION_SYSTEM, code: { in: sectionCodes } },
            select: { code: true, valueString: true },
          },
        },
      }),
      prisma.observation.findMany({
        where: {
          clinicId,
          patientId,
          codeSystem: LOINC_SYSTEM,
          status: "FINAL",
          ...(currentVisitId ? { clinicalVisitId: { not: currentVisitId } } : {}),
        },
        orderBy: { effectiveAt: "desc" },
        take: VITALS_LOOKBACK_ROWS,
        select: { code: true, valueQuantity: true, valueUnit: true, effectiveAt: true },
      }),
      prisma.observation.findMany({
        where: {
          clinicId,
          patientId,
          codeSystem: CONSULTATION_SECTION_SYSTEM,
          status: "FINAL",
          code: {
            in: [
              CONSULTATION_SECTIONS.allergies.code,
              CONSULTATION_SECTIONS.currentMedication.code,
            ],
          },
        },
        orderBy: { effectiveAt: "desc" },
        take: 20,
        select: { code: true, valueString: true },
      }),
      prisma.treatmentPlan.findMany({
        where: { clinicId, patientId },
        orderBy: { startsAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          appointments: { select: { status: true, startAt: true } },
        },
      }),
      prisma.patientTreatment.findMany({
        where: { patientId, patient: { clinicId } },
        orderBy: { performedAt: "desc" },
        take: 8,
        select: {
          id: true,
          performedAt: true,
          treatment: { select: { name: true } },
          payments: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: { amount: true, status: true },
          },
        },
      }),
      prisma.clinicalRecord.findMany({
        where: { clinicId, patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          appointmentId: true,
          template: { select: { name: true } },
          doctor: { select: { email: true, profile: true } },
        },
      }),
      prisma.clinicalVisit.count({ where: { clinicId, patientId } }),
      prisma.appointment.findMany({
        where: {
          clinicId,
          patientId,
          id: { not: params.appointmentId },
          startAt: { gt: new Date() },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        orderBy: { startAt: "asc" },
        take: 5,
        select: {
          id: true,
          startAt: true,
          doctor: { select: { email: true, profile: true } },
          box: { select: { name: true } },
        },
      }),
    ]);

    const lastVitals: Partial<Record<ConsultationVitalKey, ConsultationVitalReading>> = {};
    for (const row of vitalRows) {
      const key = vitalKeyFromCode(row.code);
      if (!key || lastVitals[key] || row.valueQuantity === null) continue;
      lastVitals[key] = {
        value: row.valueQuantity,
        unit: row.valueUnit,
        effectiveAt: row.effectiveAt.toISOString(),
      };
    }

    const carried: Partial<Record<ConsultationSectionKey, string>> = {};
    for (const row of carriedRows) {
      const key = sectionKeyFromCode(row.code);
      if (!key || carried[key] || !row.valueString) continue;
      carried[key] = row.valueString;
    }

    const sectionOf = (
      observations: Array<{ code: string; valueString: string | null }>,
      key: ConsultationSectionKey
    ) => observations.find((item) => item.code === CONSULTATION_SECTIONS[key].code)?.valueString ?? null;

    return {
      timeline: previousVisits.map((visit) => ({
        id: visit.id,
        startedAt: visit.startedAt.toISOString(),
        appointmentId: visit.appointmentId,
        doctorName: doctorLabel(visit.doctor),
        chiefComplaint: sectionOf(visit.observations, "chiefComplaint"),
        diagnosis: sectionOf(visit.observations, "diagnosis"),
        indications: sectionOf(visit.observations, "indications"),
      })),
      lastVitals,
      carriedAllergies: carried.allergies ?? null,
      carriedMedication: carried.currentMedication ?? null,
      plans: plans.map((plan) => {
        const upcomingSessions = plan.appointments
          .filter((item) => item.status === "SCHEDULED" || item.status === "CONFIRMED")
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

        return {
          id: plan.id,
          name: plan.name,
          status: plan.status,
          totalSessions: plan.appointments.length,
          completedSessions: plan.appointments.filter((item) => item.status === "COMPLETED").length,
          nextSessionAt: upcomingSessions[0]?.startAt.toISOString() ?? null,
        };
      }),
      treatments: patientTreatments.map((item) => ({
        id: item.id,
        name: item.treatment.name,
        performedAt: item.performedAt.toISOString(),
        amount: item.payments[0] ? toNumber(item.payments[0].amount) : null,
        paymentStatus: item.payments[0]?.status ?? null,
      })),
      records: records.map((record) => ({
        id: record.id,
        templateName: record.template.name,
        createdAt: record.createdAt.toISOString(),
        doctorName: doctorLabel(record.doctor),
        belongsToThisAppointment: record.appointmentId === params.appointmentId,
      })),
      totalVisits,
      lastVisitAt: previousVisits[0]?.startedAt.toISOString() ?? null,
      upcomingAppointments: upcoming.map((item) => ({
        id: item.id,
        startAt: item.startAt.toISOString(),
        doctorName: doctorLabel(item.doctor),
        boxName: item.box.name,
      })),
    };
  }
}
