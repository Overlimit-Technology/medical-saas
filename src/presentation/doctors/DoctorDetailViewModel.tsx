"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersRepositoryHttp } from "@/data/users/UsersRepository";
import type { UpdateUserDetailInput, User } from "@/domain/users/entities/User";
import {
  DeleteUserUseCase,
  GetUserDetailUseCase,
  UpdateUserDetailUseCase,
} from "@/domain/users/usecases/UserUseCases";

export type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  rut: string;
  specialty: string;
};

export function useDoctorDetailViewModel(userId: string) {
  const router = useRouter();
  const { getUserDetailUseCase, updateUserDetailUseCase, deleteUserUseCase } = useMemo(() => {
    const repo = new UsersRepositoryHttp();
    return {
      getUserDetailUseCase: new GetUserDetailUseCase(repo),
      updateUserDetailUseCase: new UpdateUserDetailUseCase(repo),
      deleteUserUseCase: new DeleteUserUseCase(repo),
    };
  }, []);

  const [doctor, setDoctor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    firstName: "",
    lastName: "",
    phone: "",
    rut: "",
    specialty: "",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const populateForm = useCallback((item: User) => {
    setForm({
      firstName: item.profile?.firstName ?? "",
      lastName: item.profile?.lastName ?? "",
      phone: item.profile?.phone ?? "",
      rut: item.doctorProfile?.rut ?? item.profile?.rut ?? "",
      specialty: item.doctorProfile?.specialty ?? "",
    });
  }, []);

  const loadDoctor = useCallback(async () => {
    setLoading(true);
    try {
      const item = await getUserDetailUseCase.execute(userId);
      setDoctor(item);
      if (item) populateForm(item);
    } finally {
      setLoading(false);
    }
  }, [getUserDetailUseCase, populateForm, userId]);

  useEffect(() => {
    void loadDoctor();
  }, [loadDoctor]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const goBack = () => router.push("/usuarios");

  const startEditing = () => {
    if (doctor) populateForm(doctor);
    setApiError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (doctor) populateForm(doctor);
    setEditing(false);
    setApiError(null);
  };

  const handleFieldChange = (key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveChanges = async () => {
    setSaving(true);
    setApiError(null);
    try {
      const payload: UpdateUserDetailInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        rut: form.rut.trim(),
        specialty: form.specialty.trim() || null,
      };

      await updateUserDetailUseCase.execute(userId, payload);
      setEditing(false);
      setSuccessMessage("Usuario actualizado exitosamente.");
      await loadDoctor();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUserUseCase.execute(userId);
      router.push("/usuarios");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    state: {
      doctor,
      loading,
      editing,
      saving,
      form,
      apiError,
      successMessage,
      deleteConfirmChecked,
      deleting,
      deleteError,
    },
    actions: {
      goBack,
      startEditing,
      cancelEditing,
      handleFieldChange,
      saveChanges,
      handleDelete,
      setDeleteConfirmChecked,
    },
  };
}
