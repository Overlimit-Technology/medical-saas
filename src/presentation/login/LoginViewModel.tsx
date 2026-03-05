"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/domain/auth/schemas/login.schema";
import { LoginUseCase } from "@/domain/auth/usecases/LoginUseCase";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function useLoginViewModel() {
  const router = useRouter();

  // Repo HTTP (client-side) + UseCase (domain)
  const useCase = useMemo(() => {
    const repo = new AuthRepositoryHttp();
    return new LoginUseCase(repo);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearErrors() {
    setFormError(null);
    setFieldErrors({});
  }

  async function submit() {
    clearErrors();

    // Validación UX (rápida, antes de pegarle al server)
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setFieldErrors({
        email: flat.fieldErrors.email?.[0],
        password: flat.fieldErrors.password?.[0],
      });
      return;
    }

    setLoading(true);
    try {
      const user = await useCase.execute(parsed.data);
      const next = user.mustChangePassword ? "/change-password" : "/select-clinic";
      router.push(next);
    } catch (e) {
      setFormError(
        e instanceof Error
          ? e.message
          : "No se pudo iniciar sesión. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    state: { email, password, loading, formError, fieldErrors },
    actions: { setEmail, setPassword, submit, clearErrors },
  };
}
