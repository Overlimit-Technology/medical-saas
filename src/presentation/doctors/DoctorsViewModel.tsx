"use client";

import { useEffect, useState } from "react";

export type UserRole = "DOCTOR" | "SECRETARY";

export type Clinic = {
  id: string;
  name: string;
  city: string;
};

export type User = {
  id: string;
  email: string;
  role: UserRole;
  profile?: { firstName: string; lastName: string; rut?: string | null } | null;
  doctorProfile?: { rut: string; specialty?: string | null } | null;
};

export function useDoctorsViewModel() {
  const [items, setItems] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    email: "",
    role: "DOCTOR" as UserRole,
    firstName: "",
    lastName: "",
    rut: "",
    clinicIds: [] as string[],
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setApiError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items ?? []);
        return;
      }
      setApiError(data.error ?? "No se pudieron cargar los usuarios.");
    } catch {
      setApiError("No se pudieron cargar los usuarios.");
    }
  };

  const loadClinics = async () => {
    const res = await fetch("/api/clinics/my");
    const data = await res.json();
    if (!data.ok) return;

    setClinics(data.items ?? []);

    const preferredClinicId =
      data.activeClinicId ?? (data.items && data.items.length > 0 ? data.items[0].id : "");
    if (preferredClinicId) {
      setForm((current) => ({
        ...current,
        clinicIds: current.clinicIds.length > 0 ? current.clinicIds : [preferredClinicId],
      }));
    }
  };

  useEffect(() => {
    loadUsers();
    loadClinics();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const handleFormChange = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    const payload = {
      email: form.email,
      role: form.role,
      firstName: form.firstName,
      lastName: form.lastName,
      rut: form.rut,
      clinicIds: form.clinicIds.length > 0 ? form.clinicIds : undefined,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo crear el usuario.");
        return;
      }
      setForm({
        email: "",
        role: "DOCTOR",
        firstName: "",
        lastName: "",
        rut: "",
        clinicIds: form.clinicIds,
      });
      setSuccessMessage("Usuario creado.");
      await loadUsers();
    } catch {
      setApiError("No se pudo crear el usuario.");
    }
  };

  const handleDelete = async (user: User) => {
    const displayName = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim();
    const label = displayName || user.email;
    const confirmed = window.confirm(
      `Confirma eliminar al usuario "${label}". Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setApiError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo eliminar el usuario.");
        return;
      }

      setSuccessMessage(
        data.softDeleted
          ? "Usuario desactivado porque tiene citas futuras."
          : "Usuario eliminado."
      );
      await loadUsers();
    } catch {
      setApiError("No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleClinic = (clinicId: string) => {
    setForm((current) => {
      const isSelected = current.clinicIds.includes(clinicId);
      return {
        ...current,
        clinicIds: isSelected
          ? current.clinicIds.filter((id) => id !== clinicId)
          : [...current.clinicIds, clinicId],
      };
    });
  };

  return {
    state: {
      items,
      clinics,
      form,
      deletingId,
      apiError,
      successMessage,
    },
    actions: {
      handleFormChange,
      submit,
      handleDelete,
      toggleClinic,
    },
  };
}
