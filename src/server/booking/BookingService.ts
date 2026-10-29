import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeId } from "@/lib/normalize";
import { isValidRun, formatRun } from "@/lib/run";
import {
  addDaysToDateString,
  chileDateString,
  chileLocalToDate,
  formatChileDateTime,
  formatChileTime,
  weekdayOf,
} from "@/lib/chileTime";

const BLOCKING_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;
const MIN_LEAD_MINUTES = 120;
const MAX_DAYS_AHEAD = 30;
const MAX_SLOTS = 300;
// Lunes a sabado. Aun no existe configuracion de dias de atencion por sede.
const OPEN_WEEKDAYS = new Set([1, 2, 3, 4, 5, 6]);
const ALLOWED_SLOT_MINUTES = [15, 20, 30, 45, 60];

export type PublicClinic = {
  clinicId: string;
  name: string;
  address: string | null;
  phone: string | null;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
};

export type PublicDoctor = { id: string; name: string; specialty: string };

export type BookingSlot = {
  doctorId: string;
  date: string;
  time: string;
  startAt: string;
  endAt: string;
};

export type BookingPatientInput = {
  firstName: string;
  lastName: string;
  run: string;
  phone: string;
  email?: string;
};

export class BookingError extends Error {}

type Db = Pick<typeof prisma, "appointment" | "box" | "user" | "patient">;

function timeToMinutes(value: string | null | undefined, fallback: number) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(total: number) {
  return `${`${Math.floor(total / 60)}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
}

export function newBookingKey() {
  return randomBytes(9).toString("base64url");
}

export class BookingService {
  static async resolveClinic(bookingKey: string): Promise<PublicClinic> {
    const settings = await prisma.clinicSettings.findUnique({
      where: { bookingKey },
      select: {
        bookingEnabled: true,
        bookingSlotMinutes: true,
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            openingTime: true,
            closingTime: true,
            isActive: true,
          },
        },
      },
    });

    if (!settings || !settings.bookingEnabled || !settings.clinic.isActive) {
      throw new BookingError("La reserva online no esta disponible.");
    }

    return {
      clinicId: settings.clinic.id,
      name: settings.clinic.name,
      address: settings.clinic.address,
      phone: settings.clinic.phone,
      openingTime: settings.clinic.openingTime ?? "08:00",
      closingTime: settings.clinic.closingTime ?? "20:00",
      slotMinutes: ALLOWED_SLOT_MINUTES.includes(settings.bookingSlotMinutes)
        ? settings.bookingSlotMinutes
        : 30,
    };
  }

  static async listDoctors(clinicId: string, db: Db = prisma): Promise<PublicDoctor[]> {
    const doctors = await db.user.findMany({
      where: {
        role: "DOCTOR",
        status: "ACTIVE",
        clinicMemberships: { some: { clinicId, status: "ACTIVE" } },
        doctorProfile: { is: { isActive: true } },
      },
      select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
        doctorProfile: { select: { specialty: true, profession: { select: { name: true } } } },
      },
    });

    return doctors
      .map((doctor) => {
        const name = `${doctor.profile?.firstName ?? ""} ${doctor.profile?.lastName ?? ""}`.trim();
        return {
          id: doctor.id,
          // Nunca se expone el correo en la pagina publica.
          name: name || "Profesional",
          specialty:
            [doctor.doctorProfile?.profession?.name, doctor.doctorProfile?.specialty?.trim()]
              .filter((part, index, all) => part && all.indexOf(part) === index)
              .join(" · ") || "Atencion general",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  static async computeSlots(
    db: Db,
    clinic: PublicClinic,
    options: { doctorId?: string | null; fromDate?: string; days?: number }
  ): Promise<BookingSlot[]> {
    const now = new Date();
    const today = chileDateString(now);
    const earliest = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);

    const fromDate = options.fromDate && options.fromDate >= today ? options.fromDate : today;
    const maxDate = addDaysToDateString(today, MAX_DAYS_AHEAD);
    const days = Math.max(1, Math.min(options.days ?? 7, 14));

    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = addDaysToDateString(fromDate, i);
      if (date > maxDate) break;
      if (OPEN_WEEKDAYS.has(weekdayOf(date))) dates.push(date);
    }
    if (dates.length === 0) return [];

    const allDoctors = await this.listDoctors(clinic.clinicId, db);
    const doctors = options.doctorId ? allDoctors.filter((d) => d.id === options.doctorId) : allDoctors;
    if (doctors.length === 0) return [];

    const boxes = await db.box.findMany({
      where: { clinicId: clinic.clinicId, isActive: true },
      select: { id: true },
    });
    if (boxes.length === 0) return [];

    const rangeStart = chileLocalToDate(dates[0], "00:00");
    const rangeEnd = chileLocalToDate(addDaysToDateString(dates[dates.length - 1], 1), "00:00");

    const busy = await db.appointment.findMany({
      where: {
        clinicId: clinic.clinicId,
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { doctorId: true, boxId: true, startAt: true, endAt: true },
    });

    const open = timeToMinutes(clinic.openingTime, 8 * 60);
    const close = timeToMinutes(clinic.closingTime, 20 * 60);
    const step = clinic.slotMinutes;
    const slots: BookingSlot[] = [];

    for (const date of dates) {
      for (let minute = open; minute + step <= close; minute += step) {
        const time = minutesToTime(minute);
        const startAt = chileLocalToDate(date, time);
        if (startAt < earliest) continue;
        const endAt = new Date(startAt.getTime() + step * 60_000);

        const overlapping = busy.filter((item) => item.startAt < endAt && item.endAt > startAt);
        const busyBoxes = new Set(overlapping.map((item) => item.boxId));
        if (boxes.every((box) => busyBoxes.has(box.id))) continue;

        for (const doctor of doctors) {
          if (overlapping.some((item) => item.doctorId === doctor.id)) continue;
          slots.push({
            doctorId: doctor.id,
            date,
            time,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          });
          if (slots.length >= MAX_SLOTS) return slots;
        }
      }
    }

    return slots;
  }

  static async getSlots(
    clinic: PublicClinic,
    options: { doctorId?: string | null; fromDate?: string; days?: number }
  ) {
    return this.computeSlots(prisma, clinic, options);
  }

  /**
   * Crea la reserva. Todo ocurre bajo un candado por sede para que dos personas
   * no puedan tomar la misma hora (la comprobacion y la creacion son atomicas).
   */
  static async book(input: {
    clinic: PublicClinic;
    doctorId: string;
    startAt: string;
    patient: BookingPatientInput;
  }) {
    const { clinic, patient } = input;

    if (!isValidRun(patient.run)) {
      throw new BookingError("El RUN no es valido. Revisa el numero y el digito verificador.");
    }

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BookingError("La hora seleccionada no es valida.");
    }

    const date = chileDateString(startAt);
    const runNormalized = normalizeId(patient.run);

    const result = await prisma.$transaction(async (tx) => {
      // El resultado se castea a texto porque Prisma no sabe leer columnas de tipo void.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${clinic.clinicId}`}))::text AS locked`;

      const slots = await this.computeSlots(tx as unknown as Db, clinic, {
        doctorId: input.doctorId,
        fromDate: date,
        days: 1,
      });
      const slot = slots.find((item) => item.startAt === startAt.toISOString());
      if (!slot) {
        throw new BookingError("Esa hora ya no esta disponible. Elige otra.");
      }

      const endAt = new Date(slot.endAt);

      let existing = await tx.patient.findFirst({
        where: { clinicId: clinic.clinicId, runNormalized },
        select: { id: true, isActive: true },
      });

      if (existing && !existing.isActive) {
        // No se reactiva ni se modifica un paciente existente desde un formulario publico.
        throw new BookingError("No pudimos completar la reserva con estos datos. Llama a la clinica.");
      }

      if (!existing) {
        existing = await tx.patient.create({
          data: {
            clinicId: clinic.clinicId,
            firstName: patient.firstName.trim(),
            lastName: patient.lastName.trim(),
            run: formatRun(patient.run),
            runNormalized,
            phone: patient.phone.trim(),
            email: patient.email?.trim() || null,
          },
          select: { id: true, isActive: true },
        });
      }

      const patientBusy = await tx.appointment.findFirst({
        where: {
          clinicId: clinic.clinicId,
          patientId: existing.id,
          status: { in: [...BLOCKING_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (patientBusy) {
        throw new BookingError("Ya tienes una reserva en ese horario.");
      }

      const overlapping = await tx.appointment.findMany({
        where: {
          clinicId: clinic.clinicId,
          status: { in: [...BLOCKING_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { boxId: true },
      });
      const busyBoxes = new Set(overlapping.map((item) => item.boxId));
      const boxes = await tx.box.findMany({
        where: { clinicId: clinic.clinicId, isActive: true },
        select: { id: true },
        orderBy: { name: "asc" },
      });
      const freeBox = boxes.find((box) => !busyBoxes.has(box.id));
      if (!freeBox) {
        throw new BookingError("Esa hora ya no esta disponible. Elige otra.");
      }

      const appointment = await tx.appointment.create({
        data: {
          clinicId: clinic.clinicId,
          patientId: existing.id,
          doctorId: input.doctorId,
          boxId: freeBox.id,
          startAt,
          endAt,
          status: "SCHEDULED",
          notes: "Reserva online. Pendiente de confirmacion por recepcion.",
        },
        select: { id: true, startAt: true },
      });

      return { appointmentId: appointment.id, startAt: appointment.startAt };
    });

    const doctors = await this.listDoctors(clinic.clinicId);
    const doctorName = doctors.find((d) => d.id === input.doctorId)?.name ?? "Profesional";

    return {
      appointmentId: result.appointmentId,
      startAt: result.startAt.toISOString(),
      when: formatChileDateTime(result.startAt),
      time: formatChileTime(result.startAt),
      doctorName,
      clinicName: clinic.name,
    };
  }
}
