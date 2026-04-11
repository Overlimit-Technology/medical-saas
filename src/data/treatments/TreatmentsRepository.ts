import type { Treatment } from "@/domain/treatments/entities/Treatment";
import type { TreatmentsRepository } from "@/domain/treatments/repositories/TreatmentsRepository";

type TreatmentsResponse = {
  ok: boolean;
  items?: Treatment[];
  error?: string;
};

export class TreatmentsRepositoryHttp implements TreatmentsRepository {
  async getTreatments(): Promise<Treatment[]> {
    const res = await fetch("/api/treatments");
    const data = (await res.json().catch(() => null)) as TreatmentsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los tratamientos.");
    }

    return data.items ?? [];
  }

  async saveTreatment(input: { id?: string; name: string; price: number }): Promise<void> {
    const editing = Boolean(input.id);
    const res = await fetch(editing ? `/api/treatments/${input.id}` : "/api/treatments", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name, price: input.price }),
    });
    const data = (await res.json().catch(() => null)) as TreatmentsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar el tratamiento.");
    }
  }

  async deleteTreatment(treatmentId: string): Promise<void> {
    const res = await fetch(`/api/treatments/${treatmentId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as TreatmentsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo eliminar el tratamiento.");
    }
  }
}
