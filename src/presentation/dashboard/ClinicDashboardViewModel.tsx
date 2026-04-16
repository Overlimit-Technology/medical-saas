import { useEffect, useState } from "react";

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
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setState({ data: json.data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Error desconocido",
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
