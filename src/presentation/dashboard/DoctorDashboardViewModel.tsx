"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardRepositoryHttp } from "@/data/dashboard/DashboardRepository";
import type { DoctorDashboardData as DashboardData } from "@/domain/dashboard/entities/Dashboard";
import { GetDoctorDashboardUseCase } from "@/domain/dashboard/usecases/DashboardUseCases";

export function useDoctorDashboardViewModel() {
  const getDoctorDashboardUseCase = useMemo(() => {
    const repo = new DashboardRepositoryHttp();
    return new GetDoctorDashboardUseCase(repo);
  }, []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextData = await getDoctorDashboardUseCase.execute();
      setData(nextData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [getDoctorDashboardUseCase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    state: { data, loading, error },
    actions: { fetchData },
  };
}
