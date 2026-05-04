import type { Appointment } from "@/domain/appointments/entities/Appointment";
import type { AppointmentsRepository } from "@/domain/appointments/repositories/AppointmentsRepository";

type AppointmentResponse = {
  ok: boolean;
  item?: Appointment;
  items?: Appointment[];
  error?: string;
};

type GenericApiResponse = {
  ok: boolean;
  error?: string;
};

export class AppointmentsRepositoryHttp implements AppointmentsRepository {
  async getAppointmentDetail(appointmentId: string): Promise<Appointment | null> {
    const res = await fetch(
      `/api/appointments/${appointmentId}?include=patient,doctor.profile,box`
    );
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.item ?? null;
  }

  async getAppointments(input: { from: string; to: string }): Promise<Appointment[]> {
    const res = await fetch(
      `/api/appointments?from=${encodeURIComponent(input.from)}&to=${encodeURIComponent(input.to)}`,
      { cache: "no-store" }
    );
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar las citas.");
    }

    return data.items ?? [];
  }

  async saveAppointment(
    appointmentId: string | null,
    input: {
      patientId: string;
      doctorId: string;
      boxId: string;
      treatmentPlanId?: string | null;
      planSessionIndex?: number | null;
      startAt: string;
      endAt: string;
      notes: string | null;
      patientFirstName?: string;
      patientLastName?: string;
      patientEmail?: string | null;
      patientPhone?: string | null;
    }
  ): Promise<Appointment> {
    const res = await fetch(appointmentId ? `/api/appointments/${appointmentId}` : "/api/appointments", {
      method: appointmentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo guardar la cita.");
    }

    return data.item;
  }

  async createContinuousTreatmentPlan(input: {
    patientId: string;
    doctorId: string;
    boxId: string;
    patientFirstName?: string;
    patientLastName?: string;
    patientEmail?: string | null;
    patientPhone?: string | null;
    name: string;
    notes: string | null;
    treatmentIds: string[];
    firstSessionStartAt: string;
    firstSessionEndAt: string;
    totalSessions: number;
    frequencyDays: number;
    appointmentNotes: string | null;
  }): Promise<void> {
    const res = await fetch("/api/treatment-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: input.patientId,
        doctorId: input.doctorId,
        boxId: input.boxId,
        patientFirstName: input.patientFirstName,
        patientLastName: input.patientLastName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
        name: input.name,
        notes: input.notes,
        treatmentIds: input.treatmentIds,
        firstSessionStartAt: input.firstSessionStartAt,
        firstSessionEndAt: input.firstSessionEndAt,
        totalSessions: input.totalSessions,
        frequencyDays: input.frequencyDays,
        appointmentNotes: input.appointmentNotes,
      }),
    });
    const data = (await res.json().catch(() => null)) as GenericApiResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo crear el plan de tratamiento.");
    }
  }

  async cancelAppointment(
    appointmentId: string,
    input: { reason: string; cancelledBy: "STAFF" | "PATIENT" | "SYSTEM" }
  ): Promise<void> {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo cancelar la cita.");
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<Appointment> {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo actualizar el estado de la cita.");
    }

    return data.item;
  }

  async updateAppointmentPayment(
    appointmentId: string,
    input: {
      treatmentId: string;
      status: "PENDING" | "PAID" | "WAIVED";
      amount: number;
      notes: string | null;
    }
  ): Promise<Appointment> {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentTreatmentId: input.treatmentId,
        paymentStatus: input.status,
        paymentAmount: input.amount,
        paymentNotes: input.notes,
      }),
    });
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo actualizar el cobro de la cita.");
    }

    return data.item;
  }

  async updateAppointmentSchedule(
    appointmentId: string,
    input: { startAt: string; endAt: string }
  ): Promise<Appointment> {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as AppointmentResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo reprogramar la cita.");
    }

    return data.item;
  }
}
