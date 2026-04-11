import type { Clinic } from "@/domain/clinics/entities/Clinic";
import type {
  CreateUserInput,
  DeleteUserResult,
  UpdateUserDetailInput,
  User,
  UserClinicsSelection,
} from "@/domain/users/entities/User";
import type { UsersRepository } from "@/domain/users/repositories/UsersRepository";

type UsersResponse = {
  ok: boolean;
  items?: User[];
  item?: User;
  error?: string;
  softDeleted?: boolean;
  activeClinicId?: string | null;
};

export class UsersRepositoryHttp implements UsersRepository {
  async getUsers(): Promise<User[]> {
    const res = await fetch("/api/users");
    const data = (await res.json().catch(() => null)) as UsersResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los usuarios.");
    }

    return data.items ?? [];
  }

  async getUserClinics(): Promise<UserClinicsSelection> {
    const res = await fetch("/api/clinics/my");
    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; items?: Clinic[]; activeClinicId?: string | null }
      | null;

    if (!res.ok || !data?.ok) {
      return { clinics: [], activeClinicId: null };
    }

    return {
      clinics: data.items ?? [],
      activeClinicId: data.activeClinicId ?? (data.items?.[0]?.id ?? null),
    };
  }

  async createUser(input: CreateUserInput): Promise<void> {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as UsersResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo crear el usuario.");
    }
  }

  async deleteUser(userId: string): Promise<DeleteUserResult> {
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as UsersResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo eliminar el usuario.");
    }

    return { softDeleted: data.softDeleted };
  }

  async getUserDetail(userId: string): Promise<User | null> {
    const res = await fetch(`/api/doctors/${userId}`);
    const data = (await res.json().catch(() => null)) as UsersResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.item ?? null;
  }

  async updateUserDetail(userId: string, input: UpdateUserDetailInput): Promise<void> {
    const res = await fetch(`/api/doctors/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as UsersResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo actualizar.");
    }
  }
}
