"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UsersRepositoryHttp } from "@/data/users/UsersRepository";
import type { User, UserRole } from "@/domain/users/entities/User";
import { USER_PERMISSIONS, type UserPermission } from "@/lib/permissions";
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserClinicsUseCase,
  GetUsersUseCase,
} from "@/domain/users/usecases/UserUseCases";
import type { Clinic } from "@/domain/clinics/entities/Clinic";

export type FormState = {
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  firstName: string;
  lastName: string;
  rut: string;
  specialty: string;
  clinicIds: string[];
  permissions: UserPermission[];
};

export type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  email: "",
  role: "DOCTOR",
  isSuperAdmin: false,
  firstName: "",
  lastName: "",
  rut: "",
  specialty: "",
  clinicIds: [],
  permissions: [],
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Nombre obligatorio.";
  if (!form.lastName.trim()) errors.lastName = "Apellido obligatorio.";
  if (!form.email.trim()) {
    errors.email = "Correo obligatorio.";
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Correo inválido.";
  }
  if (!form.rut.trim()) errors.rut = "RUN obligatorio.";
  return errors;
}

export function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function useDoctorsViewModel() {
  const { getUsersUseCase, getUserClinicsUseCase, createUserUseCase, deleteUserUseCase } =
    useMemo(() => {
      const repo = new UsersRepositoryHttp();
      return {
        getUsersUseCase: new GetUsersUseCase(repo),
        getUserClinicsUseCase: new GetUserClinicsUseCase(repo),
        createUserUseCase: new CreateUserUseCase(repo),
        deleteUserUseCase: new DeleteUserUseCase(repo),
      };
    }, []);
  const [items, setItems] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const nextUsers = await getUsersUseCase.execute();
      setItems(nextUsers);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [getUsersUseCase]);

  const loadClinics = useCallback(async () => {
    const data = await getUserClinicsUseCase.execute();
    setClinics(data.clinics ?? []);
    const preferredClinicId = data.activeClinicId ?? (data.clinics[0]?.id ?? "");
    if (preferredClinicId) {
      setForm((current) => ({
        ...current,
        clinicIds: current.clinicIds.length > 0 ? current.clinicIds : [preferredClinicId],
      }));
    }
  }, [getUserClinicsUseCase]);

  useEffect(() => {
    void loadUsers();
    void loadClinics();
  }, [loadClinics, loadUsers]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM, clinicIds: form.clinicIds });
    setErrors({});
    setApiError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ ...EMPTY_FORM, clinicIds: form.clinicIds });
    setErrors({});
    setApiError(null);
  };

  const handleFieldChange = (key: keyof FormState, value: string) => {
    const next: FormState =
      key === "role"
        ? {
            ...form,
            role: value as UserRole,
            isSuperAdmin: value === "ADMIN" ? form.isSuperAdmin : false,
          }
        : { ...form, [key]: value } as FormState;
    setForm(next);
    if (errors[key]) {
      const nextErrors = { ...errors };
      delete nextErrors[key];
      setErrors(nextErrors);
    }
  };

  const handleSuperAdminChange = (checked: boolean) => {
    setForm((current) => ({
      ...current,
      isSuperAdmin: current.role === "ADMIN" ? checked : false,
    }));
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

  const togglePermission = (permission: UserPermission) => {
    setForm((current) => {
      const isSelected = current.permissions.includes(permission);
      return {
        ...current,
        permissions: isSelected
          ? current.permissions.filter((item) => item !== permission)
          : [...current.permissions, permission],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const payload = {
      email: form.email.trim(),
      role: form.role,
      isSuperAdmin: form.role === "ADMIN" ? form.isSuperAdmin : false,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      rut: form.rut.trim(),
      specialty: form.role === "DOCTOR" && form.specialty.trim() ? form.specialty.trim() : undefined,
      clinicIds: form.clinicIds.length > 0 ? form.clinicIds : undefined,
      permissions: form.permissions,
    };

    try {
      await createUserUseCase.execute(payload);
      closeModal();
      setSuccessMessage("Usuario creado exitosamente.");
      await loadUsers();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeletingId(deleteTarget.id);
    try {
      const result = await deleteUserUseCase.execute(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage(
        result.softDeleted
          ? "Usuario desactivado porque tiene citas futuras."
          : "Usuario eliminado."
      );
      await loadUsers();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => {
      const name = `${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`.toLowerCase();
      const email = u.email.toLowerCase();
      const rut = (u.doctorProfile?.rut ?? u.profile?.rut ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || rut.includes(q);
    });
  }, [items, query]);

  const totalLabel = `${items.length} usuario${items.length === 1 ? "" : "s"}`;
  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  return {
    state: {
      items: filteredItems,
      clinics,
      loading,
      saving,
      query,
      form,
      availablePermissions: USER_PERMISSIONS,
      errors,
      apiError,
      successMessage,
      isModalOpen,
      deleteTarget,
      deleteError,
      deletingId,
      totalLabel,
      isSubmitDisabled,
      headerHint,
    },
    actions: {
      openCreateModal,
      closeModal,
      handleFieldChange,
      handleSuperAdminChange,
      toggleClinic,
      togglePermission,
      handleSubmit,
      handleDelete,
      setDeleteTarget,
      dismissDeleteModal,
      setQuery,
    },
  };
}
