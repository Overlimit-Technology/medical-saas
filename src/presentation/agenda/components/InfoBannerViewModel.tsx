"use client";

import { useEffect, useMemo, useState } from "react";
import { AgendaRepositoryHttp } from "@/data/agenda/AgendaRepository";
import type { AgendaBannerData } from "@/domain/agenda/entities/Banner";
import { GetAgendaBannerUseCase } from "@/domain/agenda/usecases/GetAgendaBannerUseCase";

export type BannerData = AgendaBannerData;

export function useInfoBannerViewModel() {
  const [data, setData] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const getAgendaBannerUseCase = useMemo(() => {
    const repo = new AgendaRepositoryHttp();
    return new GetAgendaBannerUseCase(repo);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setData(await getAgendaBannerUseCase.execute());
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [getAgendaBannerUseCase]);

  const totalToday = data ? data.completedToday + data.todayAppointments : 0;
  const progressPercent = totalToday > 0 && data ? Math.round((data.completedToday / totalToday) * 100) : 0;

  return {
    state: { data, loading, totalToday, progressPercent },
  };
}
