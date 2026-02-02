import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/audit/AuditService";

export type ClinicalVisitInput = {
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  startedAt?: Date;
  authorId: string;
};

export class ClinicalVisitsService {
  // Devuelve las citas clínicas del doctor autenticado con filtros opcionales.
  static async list(params: {
    clinicId: string;
    doctorId: string;
    patientId?: string | null;
    from?: Date | null;
    to?: Date | null;
  }) {
    const where: any = {
      clinicId: params.clinicId,
      doctorId: params.doctorId,
    };

    if (params.patientId) where.patientId = params.patientId;
    if (params.from || params.to) {
      where.startedAt = {};
      if (params.from) where.startedAt.gte = params.from;
      if (params.to) where.startedAt.lte = params.to;
    }

    return prisma.clinicalVisit.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        appointment: true,
      },
      orderBy: { startedAt: "desc" },
    });
  }

  // Inicia y registra una cita clínica, validando paciente/doctor/cita agendada.
  static async create(input: ClinicalVisitInput) {
    await this.ensurePatient(input.clinicId, input.patientId);
    await this.ensureDoctor(input.clinicId, input.doctorId);
    const appointmentId = input.appointmentId ?? null;

    if (appointmentId) {
      await this.ensureAppointment(input.clinicId, appointmentId, input.doctorId, input.patientId);
    }

    const visit = await prisma.clinicalVisit.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        appointmentId,
        startedAt: input.startedAt ?? new Date(),
      },
      include: {
        patient: true,
        doctor: { include: { profile: true } },
        appointment: true,
      },
    });

    const trace = `patient=${input.patientId}; appointment=${appointmentId ?? "none"}; startedAt=${visit.startedAt.toISOString()}`;
    await AuditService.log("clinical.start", input.authorId, trace);
    return visit;
  }

  private static async ensurePatient(clinicId: string, patientId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId, isActive: true } });
    if (!patient) throw new Error("Patient not found in clinic");
  }

  private static async ensureDoctor(clinicId: string, doctorId: string) {
    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        role: "DOCTOR",
        clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
      },
    });
    if (!doctor) throw new Error("Doctor not found in clinic");
  }

  private static async ensureAppointment(
    clinicId: string,
    appointmentId: string,
    doctorId: string,
    patientId: string
  ) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clinicId,
        doctorId,
        patientId,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (!appointment) {
      throw new Error("Appointment not found for doctor/patient in clinic");
    }
  }
}
