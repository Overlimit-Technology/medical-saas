"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import {
  GetMyProfileUseCase,
  UpdateMyProfileUseCase,
  UploadProfileImageUseCase,
} from "@/domain/profile/usecases/ProfileUseCases";

export function getInitials(firstName: string, lastName: string, email: string) {
  const seed = `${firstName} ${lastName}`.trim() || email;
  return seed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function useProfileViewModel() {
  const { getMyProfileUseCase, updateMyProfileUseCase, uploadProfileImageUseCase } = useMemo(() => {
    const repo = new ProfileRepositoryHttp();
    return {
      getMyProfileUseCase: new GetMyProfileUseCase(repo),
      updateMyProfileUseCase: new UpdateMyProfileUseCase(repo),
      uploadProfileImageUseCase: new UploadProfileImageUseCase(repo),
    };
  }, []);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    image: "",
    email: "",
    role: "",
  });
  const [clinicLabel, setClinicLabel] = useState("Sede actual");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const profile = await getMyProfileUseCase.execute();
        setForm({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? "",
          image: profile.image ?? "",
          email: profile.email,
          role: profile.role,
        });
        setClinicLabel(profile.clinicLabel ?? "Sede actual");
      } catch (error) {
        setError(error instanceof Error ? error.message : "No se pudo cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [getMyProfileUseCase]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const profile = await updateMyProfileUseCase.execute({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        image: form.image,
      });

      setForm((current) => ({
        ...current,
        firstName: profile.firstName ?? current.firstName,
        lastName: profile.lastName ?? current.lastName,
        phone: profile.phone ?? current.phone,
        image: profile.image ?? "",
      }));
      setClinicLabel(profile.clinicLabel ?? clinicLabel);
      window.dispatchEvent(new Event("profile-updated"));
      setSuccess("Perfil actualizado.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadProfileImageUseCase.execute(file);

      setForm((current) => ({
        ...current,
        image: imageUrl ?? current.image,
      }));
      setSuccess("Imagen subida. Guarda el perfil para aplicar el cambio.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim() || "Mi perfil";

  return {
    state: { form, clinicLabel, loading, saving, uploading, error, success, fullName },
    actions: { setForm, submit, handleFileUpload },
  };
}
