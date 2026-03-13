"use client";

import { useEffect, useState } from "react";

export type BannerData =
  | {
      mode: "doctor";
      name: string;
      specialty: string;
      location: string;
      email: string;
      phone: string;
      totalPatients: number;
      inTreatment: number;
      todayAppointments: number;
      completedToday: number;
    }
  | {
      mode: "clinic";
      name: string;
      location: string;
      totalPatients: number;
      inTreatment: number;
      todayAppointments: number;
      completedToday: number;
      activeDoctors: number;
    };

export function useInfoBannerViewModel() {
  const [data, setData] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/agenda/banner", { credentials: "include" });
        const json = await res.json();
        if (json.ok) {
          setData(json.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalToday = data ? data.completedToday + data.todayAppointments : 0;
  const progressPercent = totalToday > 0 && data ? Math.round((data.completedToday / totalToday) * 100) : 0;

  return {
    state: { data, loading, totalToday, progressPercent },
  };
}
