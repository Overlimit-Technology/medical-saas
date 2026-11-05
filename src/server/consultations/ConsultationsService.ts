import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";
import { AppointmentsService } from "@/server/appointments/AppointmentsService";
import { TreatmentPlansService } from "@/server/treatment-plans/TreatmentPlansService";
import { AttentionTypesService } from "@/server/clinical/AttentionTypesService";
import { decryptField, encryptField } from "@/server/security/fieldCrypto";
import { fieldIdsOf, suggestType, type AttentionTypeDef } from "@/lib/clinical/attentionTypes";
import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationHistory,
  ConsultationSectionKey,
  ConsultationStartInput,
  ConsultationVitalKey,
  PatientBackgroundData,
  PreviousFieldValue,
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

/** Campos del tipo de atencion y de la nota. code = id del campo, valueString cifrado. */
export const BLOCK_SYSTEM = "urn:zensya:block";

/** Filas a revisar para el "antes" de cada campo de los tipos de atencion. */
const FIELDS_LOOKBACK_ROWS = 400;

const EMPTY_BACKGROUND: PatientBackgroundData = { allergies: "", diseases: "", medications: "", surgeries: "", updatedAt: null };

/** Texto que queda guardado junto a cada consentimiento de atencion. */
export const ATTENTION_CONSENT_TEXT =
  "El paciente fue informado sobre su estado de salud, la atencion que se le realizara, sus objetivos, " +
  "alternativas y riesgos, y acepta recibirla. Sus datos clinicos se guardan cifrados y solo los ve el " +
  "equipo que lo atiende (Ley 20.584).";

const readSnapshot = (value: unknown) => (value && typeof value === "object" ? (value as AttentionTypeDef) : null);

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
    doctor: { select: { id: true; email: true; profile: true } };
    box: true;
    treatmentPlan: { select: { id: true; name: true; _count: { select: { appointments: true } } } };
    paymentHistory: {
      include: { patientTreatment: { include: { treatment: true } } };
    };
  };
}>;

const appointmentInclude = {
  patient: true,
  // Solo datos publicos del doctor: nunca permisos, rol ni credenciales.
  doctor: { select: { id: true, email: true, profile: true } },
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

    const [draft, history, treatments, boxes, attentionList, backgroundRow, consentRow, lastTyped] = await Promise.all([
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
      AttentionTypesService.listFor({ clinicId: scope.clinicId, userId: appointment.doctorId }),
      prisma.patientBackground.findUnique({ where: { patientId } }),
      prisma.patientConsent.findFirst({
        where: { clinicId: scope.clinicId, patientId, scope: "ATTENTION", revokedAt: null },
        orderBy: { grantedAt: "desc" },
        select: { id: true, signerName: true, grantedAt: true },
      }),
      prisma.clinicalVisit.findFirst({
        where: { clinicId: scope.clinicId, patientId, attentionTypeKey: { not: null }, ...(visit ? { id: { not: visit.id } } : {}) },
        orderBy: { startedAt: "desc" },
        select: { attentionTypeKey: true },
      }),
    ]);
    const previousFields = await this.previousFieldValues(scope.clinicId, patientId, visit?.id ?? null);

    const background = this.readBackground(backgroundRow?.data, backgroundRow?.updatedAt ?? null, history);

    // El motivo que se escribio al agendar llega precargado.
    const bookedReason = appointment.notes?.trim();
    if (!draft.sections.chiefComplaint && bookedReason && bookedReason !== "[demo]") {
      draft.sections.chiefComplaint = bookedReason;
    }

    // Alergias y farmacos se arrastran solo si hoy todavia no se escribio nada:
    // el profesional siempre puede sobrescribirlos.
    if (!draft.sections.allergies && (background.allergies || history.carriedAllergies)) {
      draft.sections.allergies = background.allergies || history.carriedAllergies || "";
    }
    if (!draft.sections.currentMedication && (background.medications || history.carriedMedication)) {
      draft.sections.currentMedication = background.medications || history.carriedMedication || "";
    }

    const visibleTypes = attentionList.types.filter((type) => !type.hidden);
    const selected = visit ? readSnapshot(visit.attentionSnapshot) : null;

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
      attention: {
        specialty: attentionList.specialty,
        types: attentionList.types,
        selected,
        preselectedKey: appointment.attentionTypeKey ?? null,
        suggestedKey: suggestType(visibleTypes, {
          preselected: appointment.attentionTypeKey,
          previousVisits: history.totalVisits - (visit ? 1 : 0),
          lastTypeKey: lastTyped?.attentionTypeKey ?? null,
        }),
      },
      background,
      previousFields,
      consent: consentRow
        ? { id: consentRow.id, signerName: consentRow.signerName, grantedAt: consentRow.grantedAt.toISOString() }
        : null,
    };
  }

  /** Guarda los antecedentes generales del paciente (cifrados). Se ven en todas sus fichas. */
  static async saveBackground(
    scope: ServiceScope & { appointmentId: string; authorId: string; data: Omit<PatientBackgroundData, "updatedAt"> }
  ): Promise<{ patientId: string; updatedAt: string }> {
    const appointment = await this.resolveAppointment(scope);
    const clean = (value: string) => value.trim().slice(0, 4000);
    const payload = encryptField(
      JSON.stringify({
        allergies: clean(scope.data.allergies),
        diseases: clean(scope.data.diseases),
        medications: clean(scope.data.medications),
        surgeries: clean(scope.data.surgeries),
      })
    );
    const row = await prisma.patientBackground.upsert({
      where: { patientId: appointment.patientId },
      update: { data: payload, updatedById: scope.authorId },
      create: { clinicId: scope.clinicId, patientId: appointment.patientId, data: payload, updatedById: scope.authorId },
    });
    return { patientId: appointment.patientId, updatedAt: row.updatedAt.toISOString() };
  }

  /** Paciente de una cita, para el registro de accesos. */
  static async patientIdOf(scope: ServiceScope & { appointmentId: string }) {
    const row = await prisma.appointment.findFirst({
      where: { id: scope.appointmentId, clinicId: scope.clinicId, doctorId: scope.doctorId ?? undefined },
      select: { patientId: true },
    });
    if (!row) throw new Error("Cita no encontrada.");
    return row.patientId;
  }

  // --------------------------------------------------------------- escritura

  /** Abre el encuentro, o devuelve el ya abierto si el profesional vuelve a entrar. */
  static async start(
    scope: ServiceScope & { appointmentId: string; doctorId: string; authorId: string; input: ConsultationStartInput }
  ): Promise<ConsultationVisit & { patientId: string }> {
    const appointment = await this.resolveAppointment(scope);

    if (appointment.status === "CANCELLED") {
      throw new Error("La cita esta cancelada: no se puede iniciar la consulta.");
    }

    const existing = await this.findOpenVisit(scope.clinicId, appointment.id);
    if (existing) {
      return { id: existing.id, startedAt: existing.startedAt.toISOString(), isClosed: false, patientId: appointment.patientId };
    }

    const type = await AttentionTypesService.resolve({
      clinicId: scope.clinicId,
      userId: appointment.doctorId,
      key: scope.input.attentionTypeKey,
    });
    if (!type) throw new Error("Elige un tipo de atencion valido.");

    // Ley 20.584: la atencion queda respaldada por un consentimiento informado guardado en el sistema.
    const consent = await prisma.patientConsent.findFirst({
      where: { clinicId: scope.clinicId, patientId: appointment.patientId, scope: "ATTENTION", revokedAt: null },
      select: { id: true },
    });
    if (!consent) {
      const signerName = scope.input.consent?.signerName?.trim();
      if (!signerName) throw new Error("Falta registrar el consentimiento informado del paciente.");
      await prisma.patientConsent.create({
        data: {
          clinicId: scope.clinicId,
          patientId: appointment.patientId,
          scope: "ATTENTION",
          textSnapshot: ATTENTION_CONSENT_TEXT,
          signerName: signerName.slice(0, 120),
          recordedById: scope.authorId,
        },
      });
    }

    const visit = await prisma.clinicalVisit.create({
      data: {
        clinicId: scope.clinicId,
        patientId: appointment.patientId,
        doctorId: scope.doctorId,
        appointmentId: appointment.id,
        attentionTypeKey: type.key,
        attentionSnapshot: type as never,
        noteFormat: type.noteFormat,
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
      `appointment=${appointment.id}; visit=${visit.id}; patient=${appointment.patientId}; type=${type.key}`
    );

    return { id: visit.id, startedAt: visit.startedAt.toISOString(), isClosed: false, patientId: appointment.patientId };
  }

  /** Guarda el borrador. Idempotente: reemplaza el valor de cada clave enviada. */
  static async saveDraft(
    scope: ServiceScope & { appointmentId: string; doctorId: string; draft: ConsultationDraft }
  ): Promise<{ savedAt: string; patientId: string }> {
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
      type: readSnapshot(visit.attentionSnapshot),
    });

    return { savedAt: new Date().toISOString(), patientId: appointment.patientId };
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
      type: readSnapshot(visit.attentionSnapshot),
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
      const snapshot = readSnapshot(visit.attentionSnapshot);
      // Solo medicina (etapas clasicas, o consultas anteriores sin tipo) registra diagnostico.
      const usesDiagnosis = snapshot ? Boolean(snapshot.classicStages) : true;
      if (usesDiagnosis && !input.draft.sections?.diagnosis?.trim()) {
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
      patientId: appointment.patientId,
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
      select: { id: true, doctorId: true, startedAt: true, attentionTypeKey: true, attentionSnapshot: true },
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

    const draft: ConsultationDraft = { sections: {}, vitals: {}, blocks: {} };

    for (const row of rows) {
      if (row.codeSystem === CONSULTATION_SECTION_SYSTEM) {
        const key = sectionKeyFromCode(row.code);
        if (key && row.valueString) draft.sections[key] = decryptField(row.valueString);
        continue;
      }
      if (row.codeSystem === BLOCK_SYSTEM) {
        if (row.valueString) draft.blocks![row.code] = decryptField(row.valueString);
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
    type?: AttentionTypeDef | null;
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
        valueString: encryptField(value),
        effectiveAt: now,
        issuedAt: now,
      });
    }

    // Campos del tipo de atencion: solo se aceptan los ids que trae la estructura con que se abrio.
    const allowed = params.type ? fieldIdsOf(params.type) : new Set<string>();
    const touchedBlocks: string[] = [];
    for (const [fieldId, rawValue] of Object.entries(params.draft.blocks ?? {})) {
      if (!allowed.has(fieldId)) continue;
      touchedBlocks.push(fieldId);
      const value = normalizeSectionValue(rawValue ?? "");
      if (!value) continue;
      rows.push({
        clinicId: params.clinicId,
        patientId: params.patientId,
        doctorId: params.doctorId,
        clinicalVisitId: params.visitId,
        status: "PRELIMINARY",
        code: fieldId,
        codeSystem: BLOCK_SYSTEM,
        codeDisplay: fieldId,
        categoryCode: "exam",
        categorySystem: OBSERVATION_CATEGORY_SYSTEM,
        categoryDisplay: "Exam",
        valueType: "STRING",
        valueString: encryptField(value),
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

    if (touchedCodes.length === 0 && touchedBlocks.length === 0) return;

    await prisma.$transaction([
      prisma.observation.deleteMany({
        where: {
          clinicalVisitId: params.visitId,
          status: "PRELIMINARY",
          OR: [
            { codeSystem: { not: BLOCK_SYSTEM }, code: { in: touchedCodes } },
            { codeSystem: BLOCK_SYSTEM, code: { in: touchedBlocks } },
          ],
        },
      }),
      ...(rows.length > 0 ? [prisma.observation.createMany({ data: rows })] : []),
    ]);
  }

  /** Ultimo valor registrado de cada campo en atenciones cerradas anteriores. */
  private static async previousFieldValues(clinicId: string, patientId: string, currentVisitId: string | null) {
    const rows = await prisma.observation.findMany({
      where: {
        clinicId,
        patientId,
        codeSystem: BLOCK_SYSTEM,
        status: "FINAL",
        ...(currentVisitId ? { clinicalVisitId: { not: currentVisitId } } : {}),
      },
      orderBy: { effectiveAt: "desc" },
      take: FIELDS_LOOKBACK_ROWS,
      select: { code: true, valueString: true, effectiveAt: true },
    });
    const out: Record<string, PreviousFieldValue> = {};
    for (const row of rows) {
      // La nota de la sesion no se muestra como "antes": cada sesion escribe la suya.
      if (out[row.code] || !row.valueString || row.code.startsWith("note.")) continue;
      out[row.code] = { value: decryptField(row.valueString), at: row.effectiveAt.toISOString() };
    }
    return out;
  }

  /** Antecedentes guardados; si aun no hay, parte con lo que arrastraban las consultas anteriores. */
  private static readBackground(data: string | undefined, updatedAt: Date | null, history: ConsultationHistory): PatientBackgroundData {
    if (!data) {
      return { ...EMPTY_BACKGROUND, allergies: history.carriedAllergies ?? "", medications: history.carriedMedication ?? "" };
    }
    try {
      const parsed = JSON.parse(decryptField(data)) as Partial<PatientBackgroundData>;
      return {
        allergies: parsed.allergies ?? "",
        diseases: parsed.diseases ?? "",
        medications: parsed.medications ?? "",
        surgeries: parsed.surgeries ?? "",
        updatedAt: updatedAt?.toISOString() ?? null,
      };
    } catch {
      return { ...EMPTY_BACKGROUND };
    }
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
      carried[key] = decryptField(row.valueString);
    }

    const sectionOf = (
      observations: Array<{ code: string; valueString: string | null }>,
      key: ConsultationSectionKey
    ) => {
      const raw = observations.find((item) => item.code === CONSULTATION_SECTIONS[key].code)?.valueString;
      return raw ? decryptField(raw) : null;
    };

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
