"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { SeguimientoRepositoryHttp } from "@/data/seguimiento/SeguimientoRepository";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import type { SeguimientoItem, SeguimientoStats } from "@/domain/seguimiento/entities/SeguimientoItem";
import { GetSeguimientoUseCase } from "@/domain/seguimiento/usecases/SeguimientoUseCases";

export type TabKey = "tratamientos" | "medicacion" | "servicios" | "metricas" | "pagos";
export type FilterKey = "todos" | "in_progress" | "completed";

export function useSeguimientoViewModel() {
  const searchParams = useSearchParams();
  const patientIdFilter = searchParams.get("patientId") ?? null;

  const [items, setItems] = useState<SeguimientoItem[]>([]);
  const [stats, setStats] = useState<SeguimientoStats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    pendingPayments: 0,
  });
  const [activeTab, setActiveTab] = useState<TabKey>("tratamientos");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getCurrentSessionUseCase, getSeguimientoUseCase } = useMemo(() => {
    const authRepo = new AuthRepositoryHttp();
    const repo = new SeguimientoRepositoryHttp();
    return {
      getCurrentSessionUseCase: new GetCurrentSessionUseCase(authRepo),
      getSeguimientoUseCase: new GetSeguimientoUseCase(repo),
    };
  }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    if (patientIdFilter) result = result.filter((item) => item.patientId === patientIdFilter);
    if (filter !== "todos") result = result.filter((item) => item.status === filter);
    return result;
  }, [items, filter, patientIdFilter]);

  const loadRole = useCallback(async () => {
    try {
      const session = await getCurrentSessionUseCase.execute();
      setRole(session.role);
    } catch {
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  }, [getCurrentSessionUseCase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSeguimientoUseCase.execute();
      setItems(result.items);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el seguimiento.");
    } finally {
      setLoading(false);
    }
  }, [getSeguimientoUseCase]);

  useEffect(() => {
    void loadRole();
  }, [loadRole]);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "ADMIN" && role !== "DOCTOR") {
      window.location.assign("/dashboard");
      return;
    }
    void loadData();
  }, [loadData, role, roleLoading]);

  const hasAccess = role === "ADMIN" || role === "DOCTOR";

  return {
    state: {
      items,
      filteredItems,
      stats,
      activeTab,
      filter,
      roleLoading,
      loading,
      error,
      hasAccess,
      patientIdFilter,
    },
    actions: {
      setActiveTab,
      setFilter,
    },
  };
}
