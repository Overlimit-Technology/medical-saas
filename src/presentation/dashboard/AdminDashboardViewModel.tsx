"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardRepositoryHttp } from "@/data/dashboard/DashboardRepository";
import type { AdminDashboardData as DashboardData } from "@/domain/dashboard/entities/Dashboard";
import { GetAdminDashboardUseCase } from "@/domain/dashboard/usecases/DashboardUseCases";

export function useAdminDashboardViewModel() {
  const getAdminDashboardUseCase = useMemo(() => {
    const repo = new DashboardRepositoryHttp();
    return new GetAdminDashboardUseCase(repo);
  }, []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextData = await getAdminDashboardUseCase.execute();
      setData(nextData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [getAdminDashboardUseCase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    state: { data, loading, error },
    actions: { fetchData },
  };
}
