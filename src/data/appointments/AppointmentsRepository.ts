import type { Appointment } from "@/domain/appointments/entities/Appointment";
import type { AppointmentsRepository } from "@/domain/appointments/repositories/AppointmentsRepository";

type AppointmentResponse = {
  ok: boolean;
  item?: Appointment;
  items?: Appointment[];
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
