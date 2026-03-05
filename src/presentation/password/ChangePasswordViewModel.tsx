"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;

export function useChangePasswordViewModel() {
  const router = useRouter();

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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.error ?? "No se pudo actualizar la contrasena.";
        setFormError(msg);
        return;
      }

      router.push("/select-clinic");
    } catch {
      setFormError("No se pudo actualizar la contrasena.");
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
