import type { Box } from "@/domain/boxes/entities/Box";
import type { BoxesRepository } from "@/domain/boxes/repositories/BoxesRepository";

type BoxesResponse = {
  ok: boolean;
  items?: Box[];
  item?: Box;
  error?: string;
};

export class BoxesRepositoryHttp implements BoxesRepository {
  async getBoxes(): Promise<Box[]> {
    const res = await fetch("/api/boxes");
    const data = (await res.json().catch(() => null)) as BoxesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los boxes.");
    }

    return data.items ?? [];
  }

  async getBox(boxId: string): Promise<Box | null> {
    const res = await fetch(`/api/boxes/${boxId}`);
    const data = (await res.json().catch(() => null)) as BoxesResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.item ?? null;
  }

  async saveBox(input: { id?: string; name: string }): Promise<Box> {
    const editing = Boolean(input.id);
    const res = await fetch(editing ? `/api/boxes/${input.id}` : "/api/boxes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name }),
    });
    const data = (await res.json().catch(() => null)) as BoxesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar el box.");
    }

    return data.item ?? { id: input.id ?? "", name: input.name };
  }

  async deleteBox(boxId: string): Promise<void> {
    const res = await fetch(`/api/boxes/${boxId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as BoxesResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo eliminar el box.");
    }
  }
}
