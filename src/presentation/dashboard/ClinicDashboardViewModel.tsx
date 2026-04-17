import { useEffect, useState } from "react";
import { isSessionErrorMessage } from "@/lib/auth/sessionErrors";

export type ClinicDashboardData = {
  clinic: { name: string; city: string };
  modules: {
    boxes: { total: number; icon: string; label: string };
    treatments: { total: number; icon: string; label: string };
    formTemplates: { total: number; icon: string; label: string };
    users: { total: number; doctors: number; staff: number; icon: string; label: string };
    patients: { total: number; icon: string; label: string };
  };
  topTreatments: Array<{ id: string; name: string; price: number }>;
};

export function useClinicDashboardViewModel() {
  const [state, setState] = useState<{
    data: ClinicDashboardData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/clinic-dashboard");
      const json = await res.json().catch(() => null) as
        | { data?: ClinicDashboardData; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? "No se pudo cargar el panel de clínica.");
      }

      setState({ data: json?.data ?? null, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";

      setState({
        data: null,
        loading: false,
        error: isSessionErrorMessage(message) ? "Tu sesión ya no está disponible." : message,
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    state,
    actions: { fetchData },
  };
}
