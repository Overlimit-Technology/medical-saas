import type { UpdateProfileInput, UserProfile } from "@/domain/profile/entities/Profile";
import type { ProfileRepository } from "@/domain/profile/repositories/ProfileRepository";

type ProfilePayload = {
  ok: boolean;
  item?: {
    id: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    permissions: string[];
    image: string | null;
    firstName: string;
    lastName: string;
    phone: string;
    teamCategoryId: string | null;
    teamCategoryName: string | null;
  };
  clinicLabel?: string;
  error?: string;
};

type UploadPayload = {
  ok: boolean;
  imageUrl?: string;
  error?: string;
};

function mapProfile(data: ProfilePayload): UserProfile {
  if (!data.item) {
    throw new Error(data.error ?? "No se pudo cargar el perfil.");
  }

  return {
    id: data.item.id,
    email: data.item.email,
    role: data.item.role,
    isSuperAdmin: data.item.isSuperAdmin === true,
    permissions: data.item.permissions ?? [],
    image: data.item.image ?? null,
    firstName: data.item.firstName,
    lastName: data.item.lastName,
    phone: data.item.phone ?? "",
    clinicLabel: data.clinicLabel ?? null,
    teamCategoryId: data.item.teamCategoryId ?? null,
    teamCategoryName: data.item.teamCategoryName ?? null,
  };
}

export class ProfileRepositoryHttp implements ProfileRepository {
  async getMyProfile(): Promise<UserProfile> {
    const res = await fetch("/api/profile/me", {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ProfilePayload | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo cargar el perfil.");
    }

    return mapProfile(data);
  }

  async updateMyProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const res = await fetch("/api/profile/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as ProfilePayload | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo actualizar el perfil.");
    }

    return mapProfile(data);
  }

  async uploadProfileImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/profile/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = (await res.json().catch(() => null)) as UploadPayload | null;

    if (!res.ok || !data?.ok || !data.imageUrl) {
      throw new Error(data?.error ?? "No se pudo subir la imagen.");
    }

    return data.imageUrl;
  }
}
