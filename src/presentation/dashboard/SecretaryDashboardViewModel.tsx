"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardRepositoryHttp } from "@/data/dashboard/DashboardRepository";
import type { SecretaryDashboardData as DashboardData } from "@/domain/dashboard/entities/Dashboard";
import { GetSecretaryDashboardUseCase } from "@/domain/dashboard/usecases/DashboardUseCases";

export function useSecretaryDashboardViewModel() {
  const getSecretaryDashboardUseCase = useMemo(() => {
    const repo = new DashboardRepositoryHttp();
    return new GetSecretaryDashboardUseCase(repo);
  }, []);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextData = await getSecretaryDashboardUseCase.execute();
      setData(nextData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [getSecretaryDashboardUseCase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    state: { data, loading, error },
    actions: { fetchData },
  };
}
