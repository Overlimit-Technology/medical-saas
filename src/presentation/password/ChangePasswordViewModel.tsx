"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { ChangePasswordUseCase } from "@/domain/auth/usecases/ChangePasswordUseCase";

type FieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;

export function useChangePasswordViewModel() {
  const router = useRouter();
  const { authRepository, changePasswordUseCase } = useMemo(() => {
    const repo = new AuthRepositoryHttp();
    return {
      authRepository: repo,
      changePasswordUseCase: new ChangePasswordUseCase(repo),
    };
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearErrors() {
    setFormError(null);
    setFieldErrors({});
  }

  function validate() {
    const errors: FieldErrors = {};

    if (!currentPassword.trim()) {
      errors.currentPassword = "Ingresa tu contrasena actual.";
    }

    if (newPassword.length < 8) {
      errors.newPassword = "La nueva contrasena debe tener al menos 8 caracteres.";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "La nueva contrasena debe ser distinta.";
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = "Confirma la nueva contrasena.";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Las contrasenas no coinciden.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    clearErrors();
    if (!validate()) return;

    setLoading(true);
    try {
      await changePasswordUseCase.execute({ currentPassword, newPassword });
      const session = await authRepository.getCurrentSession();
      router.push(session.isSuperAdmin ? "/super-admin" : "/select-clinic");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo actualizar la contrasena."
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    state: {
      currentPassword,
      newPassword,
      confirmPassword,
      loading,
      formError,
      fieldErrors,
    },
    actions: {
      setCurrentPassword,
      setNewPassword,
      setConfirmPassword,
      submit,
      clearErrors,
    },
  };
}
